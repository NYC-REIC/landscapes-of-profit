var app = (function(parent, $, L, cartodb, turf) {
    // the meat of the app. 
    // here we buffer the maps mid point and use that area to query the tax lot data in CartoDB.

    var el = parent.el;

    parent.circle = {
      
      // find the map's bounding box and center point
      // make some points for turf.js to calculate distance with
      getCurCenterTop : function() {
        el.bounds = el.map.getBounds();
        el.center = el.map.getCenter();        
        el.topPoint = turf.point([el.center.lng, el.bounds._northEast.lat]);
        el.centerPoint = turf.point([el.center.lng, el.center.lat]);
      },
      
      // this object contains chainable functions for creating the circle, updating the cartocss & data aggregation
      bufferMaker : {
        centerToTop : function (c,t) {
          this.center = c;
          this.distance = turf.distance(c,t,'kilometers') * 0.85;
          return this;
        },

        bufferCenter : function () {
          if (this.distance && this.center) {
            this.buffer = turf.buffer(this.center, this.distance, 'kilometers');
            this.circle = L.circle([el.center.lat, el.center.lng],(this.distance * 1000 * 0.9)) ;
          }
          return this;
        },

        // recreate the buffer in PostGIS for the spatial query in the CartoDB table / data layer
        webMercatorCircle : function() {
          if (this.distance && this.center) {
            // SQL query for data aggergation
            this.SQLquerySUM = "SELECT after_d_01 AS sale, (after_d_01 - before__01) AS profit " +
              "FROM nyc_flips_pluto_150712 WHERE ST_Within(" +
              "the_geom_webmercator, ST_Buffer(ST_Transform(ST_GeomFromText(" +
              "'Point(" + el.center.lng + ' ' + el.center.lat + ")',4326)," + "3857)," +
              (this.distance * 1200) + "))";        
            
            // SQL query for data layer cartocss update
            // we create another column called "within" that gives the data a boolean value for being in or out of the circle
            this.SQLqueryDL = "SELECT a.after_d_01, a.before__01, a.cartodb_id, a.the_geom_webmercator, a.within " +
              "FROM ( SELECT *, ST_DWithin( the_geom_webmercator, ST_Transform( ST_GeomFromText( 'Point(" +
              el.center.lng + ' ' + el.center.lat + ")', 4326), " + "3857)," + (this.distance * 1200) + ") as within " +
              "FROM " + el.taxLots + ") as a" 
            
            console.log(this.SQLqueryDL);
            
            // create the cartocss for the data layer update
            el.cartocss = '#' + el.taxLots + "{line-opacity: 0; polygon-fill: blue; [within=true] { polygon-fill: red; }}";

            // update the data layer's cartocss
            el.dataLayer.set({
              sql : this.SQLqueryDL,
              cartocss : el.cartocss
            });

            // get the data for aggregation
            el.sql.execute(this.SQLquerySUM)
              .done(function(data){
                  app.circle.bufferMaker.crunchData(data);
                  this.data = data;
                  return this;
              });
          }
          return this;
        },

        // helper function, uses lodash to do data analysis
        crunchData : function(data) {
            el.queriedData = data;
            console.log(data);
            el.sum = _.sum(el.queriedData.rows, function(obj) { return obj.profit; });
            el.tax = _.sum(el.queriedData.rows, function(obj) { return obj.sale; }) * 0.01;
            // el.tax = el.sum * 0.01;
            
            console.log('sum: ', el.sum, ' tax: ', el.tax.toPrecision());

            var profit = "$" + (el.sum.toFixed(2) + "").replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1,");
            var tax = "$" + (el.tax.toFixed(2) + "").replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1,");

            $('.profit').text(profit);
            $('.tax').text(tax);
        },

        // helper function to create the CartoCSS update after the circle moves
        // this ends up being too much of a request for the API to return tiles for at zooms =< 14
        // think the postgis select query is faster and might be a better option.
        updateCartoCSS : function() {
          var cartoCSS = "",
                tmp = "";
          el.cartodb_ids.forEach(function(el, i, arr) {
            if (i < arr.length -1) {
              tmp += '[cartodb_id=' + el + '],';
            } else {
              tmp += '[cartodb_id=' + el + ']';
            }
          });
          // create the cartoCSS, using test colors of blue and red right now...
          cartoCSS += '#' + el.taxLots + "{" + "polygon-fill: blue;" + tmp + "{" + "polygon-fill: red;" + "}}"
          el.dataLayer.setCartoCSS(cartoCSS);
        },

        testBuffer : function () {
          if (this.buffer) {
            el.fgTest.clearLayers();
            var g = L.geoJson(this.buffer);
            el.fgTest.addLayer(this.circle);
            // el.fgTest.addLayer(g);
          }
        }
      }, // end bufferMaker

      makeBuffer : function() {
        app.circle.bufferMaker
          .centerToTop(el.centerPoint, el.topPoint)
          .bufferCenter()
          .testBuffer();
      },

      queryCDB : function() {
        app.circle.bufferMaker.webMercatorCircle();
      }

    }; // end circle

    return parent;

})(app || {}, jQuery, L, cartodb, turf);