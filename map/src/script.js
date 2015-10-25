var app = app || {};

app.vars = {
    baselayer : new L.StamenTileLayer("toner-lite"),
    sql : new cartodb.SQL({ user: 'clhenrick' }),
    all_the_things : [],
    $map : $('#map'),
    url : window.location.href,
    hashurl : url.split('#'),
        
};



app.map(function(d,w,$) {

    var init = function() {
        app.vars.map = new L.Map($map)
    }

    return {
        init : init
    }

})(document, window, jQuery);


app.init = function() {
    app.map.init();
    app.gui.init();
}

url = window.location.href
hashurl = url.split('#')

cc = new L.FeatureGroup()
ff = new L.FeatureGroup()

var map, buildings, geom_center, prev_bldg

c = sql.execute("SELECT * FROM nycc_joined_to_nyc_flips_2263").done(function(geojson) {
    cc_map = L.geoJson(geojson)
    cc_map.addTo(cc)
})

if (hashurl[1]){
    divid = '_'+hashurl[1].toString()
    // console.log(divid)
    // viewdiv = document.getElementById(divid)
    f = sql.execute("SELECT * FROM nyc_flips WHERE (bbl ="+hashurl[1]+")").done(function(geojson){
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
        zoomChangeLayers(map)
        getBuildingsByBB(map)
        map.on('moveend', function(){
            getBuildingsByBB(map)   
        })

    })
} else {
    var map = new L.Map("map", {
    zoomControl: false,
    center: new L.LatLng(40.7009,-73.9579),
    zoom: 11
    });
    cc.addTo(map)
    zoomChangeLayers(map)
    map.on('moveend', function(){
     getBuildingsByBB(map)   
    })
    
}

new L.Control.Zoom({ position: 'bottomright' }).addTo(map);

//don't load everything at once if you don't have to
function getBuildingsByBB(m){
    // m.on('moveend', function(){
        bounds = m.getBounds()
        b = sql.execute("SELECT * FROM nyc_flips WHERE the_geom && ST_SetSRID(ST_MakeBox2D(ST_Point("+bounds._northEast.lng+","+bounds._northEast.lat+"), ST_Point("+bounds._southWest.lng+","+bounds._southWest.lat+")), 4326)").done(function(geojson){       
        for (var i = geojson.features.length - 1; i >= 0; i--) {
            if ($.inArray(geojson.features[i].properties.bbl,all_the_things) == -1){
                //assigning a height and color property to buildings just to see if i can dynamically do that and then use OSMBuildings? 
                // geojson.features[i].properties['height'] = (geojson.features[i].properties.after_d_01)/1000
                // geojson.features[i].properties['color'] = "rgb(255,200,150)"
                all_the_things.push(geojson.features[i].properties.bbl)
                
                add_json = L.geoJson(geojson.features[i],{
                    style : {
                        'fillColor': '#c14a95',
                        'fillOpacity': 1,
                        'stroke': 0
                    },
                    onEachFeature: function(feature, layer){
                        layer.on({click: function(e){
                            map.fitBounds(layer.getBounds());
                            window.location.hash = feature.properties.bbl
                            if (prev_bldg){
                                prev_bldg.setStyle({
                                    'fillColor': '#c14a95',
                                    'fillOpacity': 1,
                                    'stroke': 0
                                })
                            }
                            layer.setStyle({
                                    'fillColor': '#FA98D6',
                                    'fillOpacity': 1,
                                    'stroke': 0
                            })

                            prev_bldg = layer
                         }})
                    }
                    })
                add_json.addTo(ff)
            }
        };
        })
   // })
}

function zoomChangeLayers(m) {
    m.on('viewreset', function(e){
        if(m.getZoom() > 15){
            m.removeLayer(cc)
            baselayer.addTo(m)
            getBuildingsByBB(m)
            ff.addTo(m)
        } else {
            cc.addTo(m)
            m.removeLayer(baselayer)
            m.removeLayer(ff)
        }
    })
}

//navigation 
var pull = $('#pull');
var nav = $('#ui-info');

navHeight  = nav.height();

$(pull).on('click', function(e) {  
        e.preventDefault();  
        nav.slideToggle();  
    }); 

$(window).resize(function(){  
    var w = $(window).width();  
    if(w > 320 && nav.is(':hidden')) {  
        nav.removeAttr('style');
    }  
});  

$(document).ready(function () {
  // Searching within a bounding box
  var southWest = L.latLng(40.49, -74.27),
      northEast = L.latLng(40.87, -73.68),
      bounds = L.latLngBounds(southWest, northEast);

  L.control.geocoder({
    bbox: bounds,
    position: 'topright',
    layers: 'address',
    placeholder: 'Search within New York City'
  }).addTo(map);
});
