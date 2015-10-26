var app = app || {};

app.vars = {
  baselayer : new L.StamenTileLayer("toner-lite"),
  sql : new cartodb.SQL({ user: 'chenrick' }),
  taxLots : "nyc_flips_pluto_150712",
  all_the_things : [],
  $map : $('#map'),
  url : window.location.href,
  hashurl : null,
  map : null,
  buildings: null,
  geom_center: null,
  prev_bldg: null,
  layerSource : null,
  cdbOptions : null,
  dataLayer : null,
  cartocss : app.cartocss
};

app.vars.init = function() {
  app.vars.hashurl = app.vars.url.split('#')
}

app.map = {}

app.map.init = function() {

  var params = {
    center : [40.694631,-73.925028],
    minZoom : 9,
    maxZoom : 18,
    zoom : 11, 
    zoomControl : false,
    infoControl: false,
    attributionControl: true
  }

  app.vars.map = new L.Map('map', params);
  app.vars.baselayer.addTo(app.vars.map);
  app.getCartoDB(app.vars.map);

  function tmp() {
      if (app.vars.hashurl[1]){
        divid = '_'+app.vars.hashurl[1].toString()
        // console.log(divid)
        // viewdiv = document.getElementById(divid)
        f = app.vars.sql.execute("SELECT * FROM nyc_flips WHERE (bbl ="+app.vars.hashurl[1]+")").done(function(geojson){
          // I cant' believe I'm doing this 
          flipLL = []
          center = geojson.features[0].geometry.coordinates[0]
          for (var i = 0; i < center.length; i++) {
            for (var j = 0; j < center[i].length; j++) {
               arr = []
               newLat = center[i][j][1]
               newLon = center[i][j][0]
               arr.push(newLat, newLon)
               flipLL.push(arr)
            };
          };
          get_center = L.polygon(flipLL)
          //super-sketch thing for dealing with json lon/lat vs leaflet lat/lon
          
          geom_center = get_center.getBounds().getCenter()
           map = new L.Map("map",{
            zoomControl: false,
            center: geom_center,
            zoom: 19
          })
          baselayer.addTo(map)
          buildings = L.geoJson(geojson, {
            style : {
              'fillColor': '#FA98D6',
              'fillOpacity': 1,
              'stroke': 0
            },
            onEachFeature: function(feature, layer){
              layer.on({click: function(e){
                window.location.hash = feature.properties.bbl
               }})
              prev_bldg = layer
              all_the_things.push(feature.properties.bbl)
            }
          })
          buildings.addTo(ff)
          ff.addTo(map)
          app.map.zoomChangeLayers(map)
          app.map.getBuildingsByBB(map)
          map.on('moveend', function(){
            app.map.getBuildingsByBB(map)   
          })

        })
      } else {
        app.map.zoomChangeLayers(app.vars.map)
        app.vars.map.on('moveend', function(){
           app.map.getBuildingsByBB(app.vars.map)   
        });
      }
  }

  new L.Control.Zoom({ position: 'bottomright' }).addTo(app.vars.map);

}

app.map.zoomChangeLayers = function(m) {
  m.on('viewreset', function(e){
    if(m.getZoom() > 10){
      app.vars.baselayer.addTo(m)
      // app.map.getBuildingsByBB(m)
    } else {
      m.removeLayer(app.vars.baselayer)
    }
  })
}


app.getCartoDB = function(m) {

    console.log(app.vars.cartocss.taxLots);

    // data layer settings for the tax lots
    app.vars.layerSource = {
        user_name : "chenrick",
        type : "cartodb",
        sublayers : [{
            sql : "SELECT * FROM " + app.vars.taxLots,
            cartocss : app.vars.cartocss.taxLots,
            interactivity: ""
        }]
    }

    // cartodb layer params
    app.vars.cdbOptions = {
        cartodb_logo: false,
        legends: false,
        https: true,
        attributionControl: true
    };

    // create the cartodb layer
    cartodb.createLayer(m, app.vars.layerSource, app.vars.cdbOptions)
        .addTo(m)
        .on('done',function(layer) {
            layer.setZIndex(10); // make sure the cartodb layer is on top
            app.vars.dataLayer = layer.getSubLayer(0);
            console.log(layer, app.vars.dataLayer);
            var test = app.vars.sql.execute("SELECT * FROM {{taxLots}}", { taxLots: app.vars.taxLots });
            test.done(function(data){
                console.log(data);
            })

            console.log(app.vars.layerSource);

        });
}




app.init = function() {
  app.vars.init();
  app.map.init();  
}


//navigation 
// var pull = $('#pull');
// var nav = $('#ui-info');

// navHeight  = nav.height();

// $(pull).on('click', function(e) {  
//     e.preventDefault();  
//     nav.slideToggle();  
//   }); 

// $(window).resize(function(){  
//   var w = $(window).width();  
//   if(w > 320 && nav.is(':hidden')) {  
//     nav.removeAttr('style');
//   }  
// });  

$(document).ready(function () {
  app.init();
});