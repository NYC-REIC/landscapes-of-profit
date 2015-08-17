var sql = new cartodb.SQL({ user: 'lifewinning', format: 'geojson' });

all_the_things = []

url = window.location.href
hashurl = url.split('#')

cc = new L.FeatureGroup()
ff = new L.FeatureGroup()

var map, buildings, geom_center, prev_bldg

c = sql.execute("SELECT * FROM nycc_joined_to_nyc_flips_2263").done(function(geojson) {
    cc_map = L.geoJson(geojson)
    cc_map.addTo(cc)
})

var tangram = Tangram.leafletLayer({
    scene: 'src/scene.yaml',
    attribution: '<a href="https://mapzen.com/tangram" target="_blank">Tangram</a> | &copy; OSM contributors | <a href="https://mapzen.com/" target="_blank">Mapzen</a>'
     });

window.layer = tangram
var scene = tangram.scene
window.scene = scene

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
        buildings = L.geoJson(geojson, {
            style : {
                'fillColor': '',
                'fillOpacity': 0,
                'stroke': 0
            },
            // onEachFeature: function(feature, layer){}
                
        })
        buildings.addTo(ff)
        ff.addTo(map)
        tangram.addTo(map);
        map.setView(map.getBounds().getCenter())
        zoomChangeLayers(map)
        // getBuildingsByBB(map)
        // map.on('moveend', function(){
        //     getBuildingsByBB(map)   
        // })

    })
} else {
    var map = new L.Map("map", {
    zoomControl: false,
    center: new L.LatLng(40.7009,-73.9579),
    zoom: 11
    });
    cc.addTo(map)
    zoomChangeLayers(map)
    // map.on('moveend', function(){
    // getBuildingsByBB(map)   
    // })
    
}

// new L.Control.Zoom({ position: 'bottomright' }).addTo(map);

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
                        'fillColor': '',
                        'fillOpacity': 0,
                        'stroke': 0
                    },
                    onEachFeature: function(feature, layer){
                        layer.on({click: function(e){
                            map.fitBounds(layer.getBounds());
                            window.location.hash = feature.properties.bbl
                            if (prev_bldg){
                                prev_bldg.setStyle({
                                    'fillColor': '',
                                    'fillOpacity': 0,
                                    'stroke': 0
                                })
                            }
                            layer.setStyle({
                                    'fillColor': '',
                                    'fillOpacity': 0,
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
        if(m.getZoom() > 14){
            m.removeLayer(cc)
            tangram.addTo(map);
            // map.setView(map.getBounds().getCenter())
            // getBuildingsByBB(m)
            ff.addTo(m)
        } else {
            cc.addTo(m)
            map.removeLayer(tangram);
            m.removeLayer(ff)
        }
    })
}

//popups for buildings


function initFeatureSelection () {

    var selection_info = document.createElement('div');
    selection_info.setAttribute('class', 'bldg-info');
    selection_info.style.display = 'block';
    
    // Show feature on click
    scene.container.addEventListener('click', function (event) {
        var pixel = { x: event.clientX, y: event.clientY };

        scene.getFeatureAt(pixel).then(function(selection) {    
            if (!selection) {
                return;
            }
            var feature = selection.feature;
            if (feature != null) {

                if (feature.properties.bbl != null) {
                    window.location.hash = feature.properties.bbl
                    console.log(feature.properties);
                    selection_info.innerHTML =  "<h3>"+feature.properties.bbl+"</h3>";
                    scene.container.appendChild(selection_info);
                }
            }
            else if (selection_info.parentNode != null) {
                selection_info.parentNode.removeChild(selection_info);
            }
        });
        
        // Don't show labels while panning
        if (scene.panning == true) {
            if (selection_info.parentNode != null) {
                selection_info.parentNode.removeChild(selection_info);
            }
        }
    });
    
}

window.addEventListener('load', function () {
    // Scene initialized
    layer.on('init', function() {
        initFeatureSelection();
    });
});


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
