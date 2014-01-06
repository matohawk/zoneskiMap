// Simple JavaScript Templating
// John Resig - http://ejohn.org/ - MIT Licensed
(function(){
    var _tmplCache = {}
    this.parseTemplate = function(str, data) {
        /// <summary>
        /// Client side template parser that uses &lt;#= #&gt; and &lt;# code #&gt; expressions.
        /// and # # code blocks for template expansion.
        /// NOTE: chokes on single quotes in the document in some situations
        ///       use &amp;rsquo; for literals in text and avoid any single quote
        ///       attribute delimiters.
        /// </summary>
        /// <param name="str" type="string">The text of the template to expand</param>
        /// <param name="data" type="var">
        /// Any data that is to be merged. Pass an object and
        /// that object's properties are visible as variables.
        /// </param>
        /// <returns type="string" />
        var err = "";
        try {
            var func = _tmplCache[str];
            if (!func) {
                var strFunc =
                    "var p=[],print=function(){p.push.apply(p,arguments);};" +
                        "with(obj){p.push('" +

                        str.replace(/[\r\t\n]/g, " ")
                            .replace(/'(?=[^#]*#>)/g, "\t")
                            .split("'").join("\\'")
                            .split("\t").join("'")
                            .replace(/<#=(.+?)#>/g, "',$1,'")
                            .split("<#").join("');")
                            .split("#>").join("p.push('")
                        + "');}return p.join('');";

                //alert(strFunc);
                func = new Function("obj", strFunc);
                _tmplCache[str] = func;
            }
            return func(data);
        } catch (e) { err = e.message; }
        return "< # ERROR: " + err.htmlEncode() + " # >";
    }
})();

var map;
var markers = [];
var labelRegionArray = [];
var mapOptions = {};
var stationsArray = [];
var currentInfoWindow;
var currentListItem;
var centerLatitude = 46.972756;
var centerLongitude = -71.905518; 
var startZoom = 7;
var skitype = (new Date().getHours() < 15)? "jour" : "soir";
var mode = "ouverture";
var showRegs = false;
var showClosed = false;

var icones = {
        'iconevide' : "icones/vide.png",
        'stations' : {
            'ouverture' : {
                'iconend' : "ico-nd",
                'iconeferme' : "ico-ferme",
                'ouvert100' : "ico-ouvert100",
                'ouvert80' : "ico-ouvert80",
                'ouvert20' : "ico-ouvert20",
                'ouvert0' : "ico-ferme"
            },
            'neige' : {
                'iconedame' : "ico-dame",
                'icone1cm' : "ico-1cm",
                'icone10cm' : "ico-10cm",
                'icone30cm' : "ico-30cm",
            },
            'meteo' : {
                'meteoPas' : "ico-meteo_Pas",
                'meteoPluieFaible' : "ico-meteo_PluieFaible",
                'meteoPluieMoyenne' : "ico-meteo_PluieMoyenne",
                'meteoPluieGrosse' : "ico-meteo_PluieGrosse",
                'meteoNeigeFaible' : "ico-meteo_NeigeFaible",
                'meteoNeigeMoyenne' : "ico-meteo_NeigeMoyenne",
                'meteoNeigeGrosse' : "ico-meteo_NeigeGrosse",
                'meteoMixte' : "ico-meteo_Mixte"
            }

      }

}

var mapStyle =  [
    {
        featureType: 'all',
        elementType: 'all',
        stylers: [
            {invert_lightness: false},
            {weight: 0.3},
            {hue: "#00b2ff"}
        ]
    }
];


// Define the overlay, derived from google.maps.OverlayView
function LabelRegion(opt_options) {
    // Initialization
    this.setValues(opt_options);

    // Label specific
    var span = this.span_ = document.createElement('span');
    span.className = "labelRegion";

    var div = this.div_ = document.createElement('div');
    div.appendChild(span);
    div.style.cssText = 'position: absolute; zIndex : 201;';
};
LabelRegion.prototype = new google.maps.OverlayView;

// Implement onAdd
LabelRegion.prototype.onAdd = function() {
    var pane = this.getPanes().overlayLayer;
    pane.appendChild(this.div_);

    // Ensures the label is redrawn if the text or position is changed and the visibility.
    var me = this;
    this.listeners_ = [
        google.maps.event.addListener(this, 'position_changed',
            function() { me.draw(); }),
        google.maps.event.addListener(this, 'text_changed',
            function() { me.draw(); }),
        google.maps.event.addListener(this, 'visible_changed',
            function() { me.draw(); })
    ];
};

// Implement onRemove
LabelRegion.prototype.onRemove = function() {
    this.div_.parentNode.removeChild(this.div_);

    // Label is removed from the map, stop updating its position/text.
    for (var i = 0, I = this.listeners_.length; i < I; ++i) {
        google.maps.event.removeListener(this.listeners_[i]);
    }
};

// Implement draw
LabelRegion.prototype.draw = function() {
    var projection = this.getProjection();
    var position = projection.fromLatLngToDivPixel(this.get('position'));

    var div = this.div_;
    div.style.left = position.x + 'px';
    div.style.top = position.y + 'px';

    this.span_.innerHTML = this.get('text').toString();

    if(this.get('visible') === true){

        div.style.display = 'block';

    }else if(this.get('visible') === false){

        div.style.display = 'none';

    }

};


// Define the overlay, derived from google.maps.OverlayView
function Station(opt_options) {
    // Initialization
    this.setValues(opt_options);

    // icon specific
    var span = this.span_ = document.createElement('span');

    var div = this.div_ = document.createElement('div');
    div.appendChild(span);
    div.style.cssText = 'position: absolute; zIndex : 200;';
};
Station.prototype = new google.maps.OverlayView;

// Implement onAdd
Station.prototype.onAdd = function() {
    var pane = this.getPanes().overlayLayer;
    pane.appendChild(this.div_);

    var me = this;

    this.listeners_ = [
        google.maps.event.addListener(this, 'position_changed',
            function() { me.draw(); }),
        google.maps.event.addListener(this, 'classname_changed',
            function() { me.draw(); }),
        google.maps.event.addListener(this, 'text_changed',
            function() { me.draw(); }),
        google.maps.event.addListener(this, 'visible_changed',
            function() { me.draw(); }),
        google.maps.event.addDomListener(this.div_, 'click',
            function() {
                google.maps.event.trigger(me, 'click');
            })
    ];
};

// Implement onRemove
Station.prototype.onRemove = function() {
    this.div_.parentNode.removeChild(this.div_);

    // Label is removed from the map, stop updating its position/text.
    for (var i = 0, I = this.listeners_.length; i < I; ++i) {
        google.maps.event.removeListener(this.listeners_[i]);
    }
};

// Implement draw
Station.prototype.draw = function() {
    var projection = this.getProjection();
    var position = projection.fromLatLngToDivPixel(this.get('position'));

    var div = this.div_;
    div.style.left = position.x + 'px';
    div.style.top = position.y + 'px';

    this.span_.className = this.get('classname');
    this.span_.title = this.get('text');

    if(this.get('visible') === true){

        div.style.display = 'block';

    }else if(this.get('visible') === false){

        div.style.display = 'none';

    }
};

// http://www.netlobo.com/url_query_string_javascript.html
function gup( name )
{
    name = name.replace(/[\[]/,"\\\[").replace(/[\]]/,"\\\]");
    var regexS = "[\\?&]"+name+"=([^&#]*)";
    var regex = new RegExp( regexS );
    var results = regex.exec( window.location.href );
    if( results == null )
        return "";
    else
        return results[1];
}

function switchSkiType(){

    if(skitype == 'soir'){

        mapStyle[0].stylers[0].invert_lightness = true;

    } else if(skitype == 'jour'){

        mapStyle[0].stylers[0].invert_lightness = false;

    }

}

function addStatus(marker){

    var thisMarker = marker;

    if(thisMarker.assq == '0' || (thisMarker.etatMontagne == 1 && thisMarker.MiseAJour && !(new Date().getTime() - new Date(thisMarker.MiseAJour).getTime() <= 3600 * 48 * 1000))){

        thisMarker.status = 'indetermine';
        thisMarker.pistesOuvertesJourForView = '?';
        thisMarker.pistesOuvertesSoirForView = '?';
        thisMarker.surfacePistesForView = 'indéterminé';
        thisMarker.basePistesForView = 'indéterminé';
        thisMarker.couverturePistesForView = 'indéterminé';
        thisMarker.precipitations24heuresForView = '?';
        thisMarker.precipitations48heuresForView = '?';
        thisMarker.precipitations7joursForView = '?';

    } else if(thisMarker.etatMontagne == 0 || (thisMarker.pistesOuvertesJour == 0 && thisMarker.pistesOuvertesSoir == 0)) {

        thisMarker.status = 'ferme';
        thisMarker.pistesOuvertesJourForView = '0';
        thisMarker.pistesOuvertesSoirForView = '0';
        thisMarker.surfacePistesForView = 'indéterminé';
        thisMarker.basePistesForView = 'indéterminé';
        thisMarker.couverturePistesForView = 'indéterminé';
        thisMarker.precipitations24heuresForView = '?';
        thisMarker.precipitations48heuresForView = '?';
        thisMarker.precipitations7joursForView = '?';

    } else if((skitype == 'jour' && thisMarker.pistesOuvertesJour == 0) || (skitype == 'soir' && thisMarker.pistesOuvertesSoir == 0)) {

        thisMarker.status = 'ferme';
        thisMarker.pistesOuvertesJourForView = thisMarker.pistesOuvertesJour;
        thisMarker.pistesOuvertesSoirForView = thisMarker.pistesOuvertesSoir;
        thisMarker.surfacePistesForView = thisMarker.surfacePistes;
        thisMarker.basePistesForView = thisMarker.basePistes;
        thisMarker.couverturePistesForView = thisMarker.couverturePistes;
        thisMarker.precipitations24heuresForView = thisMarker.precipitations24heures;
        thisMarker.precipitations48heuresForView = thisMarker.precipitations48heures;
        thisMarker.precipitations7joursForView = thisMarker.precipitations7jours;

    } else {

        thisMarker.status = 'ouvert';
        thisMarker.pistesOuvertesJourForView = thisMarker.pistesOuvertesJour;
        thisMarker.pistesOuvertesSoirForView = thisMarker.pistesOuvertesSoir;
        thisMarker.surfacePistesForView = thisMarker.surfacePistes;
        thisMarker.basePistesForView = thisMarker.basePistes;
        thisMarker.couverturePistesForView = thisMarker.couverturePistes;
        thisMarker.precipitations24heuresForView = thisMarker.precipitations24heures;
        thisMarker.precipitations48heuresForView = thisMarker.precipitations48heures;
        thisMarker.precipitations7joursForView = thisMarker.precipitations7jours;
    }

}

function getOuverture(marker){

    var thisMarker = marker;
    var ouverture = 0;
    var icoOuverture = '';

        if(thisMarker.status == 'ouvert'){

            var skitypeCap = skitype.charAt(0).toUpperCase() + skitype.slice(1);
            proportion = thisMarker['pistesOuvertes' + skitypeCap] / thisMarker['pistesTotal' + skitypeCap];

            /* pourcentage d'ouverture */
            if(proportion != 0){

                if(proportion > 0){

                    ouverture = 20;

                }else if(proportion > 0.2){

                    ouverture = 80;

                }else if(proportion > 0.8){

                    ouverture = 100;

                }

                icoOuverture = icones.stations.ouverture['ouvert' + ouverture];

            } else {

                icoOuverture = icones.stations.ouverture.iconeferme;

            }

        } else if(thisMarker.status == "ferme"){

            /* Station closed */
            icoOuverture = icones.stations.ouverture.iconeferme;

        } else if(thisMarker.status == "indetermine"){

            icoOuverture = icones.stations.ouverture.iconend;

        }

    return icoOuverture;

}


function getSnowFallIcon(marker){

    var thisMarker = marker;
    var snowFall = thisMarker[mode];
    var convertSnowFall = '1cm';

    if(thisMarker.status != 'ferme' && thisMarker.status != 'indetermine'){

        if(snowFall >= 20){

            convertSnowFall = '30cm';

        }

        else if(snowFall >= 10){

            convertSnowFall = '10cm';

        }

        else if(snowFall >= 5){

            convertSnowFall = '1cm';

        }

        else if(snowFall >= 0){

            convertSnowFall = 'dame';

        }

        return icones.stations.neige['icone' + convertSnowFall];

    } else {

        return getOuverture(marker);

    }

}

function getModeMeteoConvert(marker){

    var thisMarker = marker;

        var meteoKey;

        switch(mode){

            case 'meteo-ce-soir':
                meteoKey = 'MMD0ICON';
                break;

            case 'meteo-demain':
                meteoKey = 'MMD1ICON';
                break;

            case 'meteo-apres-demain':
                meteoKey = 'MMD2ICON';
                break;

        }

        return 'ico-icone-' + thisMarker[meteoKey];

}

function getIcone(marker){

    var proportion = 0;

    switch(mode)
    {
        case 'ouverture':
            return getOuverture(marker);
            break;

        case 'precipitations24heures':
        case 'precipitations48heures':
        case 'precipitations7jours':
            return getSnowFallIcon(marker);
            break;

        case 'meteo-ce-soir':
        case 'meteo-demain':
        case 'meteo-apres-demain':
            return getModeMeteoConvert(marker);
            break;

    }

}

function filtreNuit(marker){
    /* todo : need to be removed  after refactoring */
    thisMarker = marker;

    if(skitype == 'soir' && thisMarker.pistesTotalSoir == 0){

        return false;

    } else{

        return true;

    }

}

function setVisibility(marker){

    thisMarker = marker;
    if(showClosed === false && (marker.status == "ferme" || marker.status == "indetermine")){

        return false;

    } else {

        if(skitype == 'soir' && thisMarker.pistesTotalSoir == 0){

            return false;

        } else{

            return true;

        }

    }
}


function initMap(){

    switchSkiType();
    google.maps.visualRefresh = true;

   /* Si paramètres dans la query string centrer la carte sur une region */
    var reg = gup("region");
    var regionmap = {};

    if(reg != ""){

        $.each(markers, function(i, marker){

            if(marker.type == reg){

                centerLatitude = marker.latitude;
                centerLongitude = marker.longitude;
                startZoom = parseInt(marker.zoom);

            }

        });

    }

    /* map init options */
    mapOptions = {
        zoom: startZoom,
        center: new google.maps.LatLng(centerLatitude, centerLongitude),
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        styles: mapStyle,
        scrollwheel: false,
        scaleControl: true,
        zoomControl: true,
        panControl: false,
        overviewMapControl: false,
        mapTypeControl: false,
        disableDefaultUI:false,
        mapTypeControlOptions: {
            mapTypeIds: [
                google.maps.MapTypeId.ROADMAP],
            style: google.maps.MapTypeControlStyle.HORIZONTAL_BAR
        }
    };

    /* create map with all the cluster */
    map = new google.maps.Map(document.getElementById('map'),
        mapOptions);

    /* add control to the map */
    var containerCtrl = document.getElementById("container-ctrl");
    containerCtrl.style.display = 'block';

    /* create unique infowindow for all markers */
    var infowindow = new google.maps.InfoWindow({
        content: ''
    });


        $.each(markers, function(i, marker){

            /* Region */
            if(marker.vln == 0 && marker.type != 'tqc'){

                /* add label to the region */
                var labelRegion = new LabelRegion({
                    map: map
                });

                labelRegion.set('position', new google.maps.LatLng(marker.latitude, marker.longitude));
                labelRegion.set('text', marker.codepostal);
                labelRegion.set('data', marker);
                labelRegion.set('visible', false);

                labelRegionArray.push(labelRegion);

            /* stations */
            } else if(marker.type != 'tqc'){

                /* ajout au marker le status réel ferme / ouvert / indetermine */
                addStatus(marker);

                /* add label to the region */
                var station = new Station({
                    map: map
                });

                station.set('position', new google.maps.LatLng(marker.latitude, marker.longitude));
                station.set('text', marker.codepostal);
                station.set('data', marker);
                station.set('visible', setVisibility(marker));
                station.set('classname', getIcone(marker));

                var windowContentNight = parseTemplate($("#tpml-info-window-night").html(), marker );
                var windowContentDay = parseTemplate($("#tpml-info-window-day").html(), marker );

                google.maps.event.addListener(station, 'click', function() {
                
                if(skitype == 'jour'){
                    infowindow.setContent(windowContentDay);
                } else if(skitype == 'soir'){
                    infowindow.setContent(windowContentNight);
                }
                    infowindow.open(map,station);

                });

                stationsArray.push(station);

            }

    });

};

function handleResize() {

    var height = $( window).height();
    $('#map').height(height + 'px');
    $('#sidebar').height(height + 'px');

};

function afficherStations(){

    var $montagnes = $('#montagnes');

    $.each(markers, function(i, marker){
        if(i == 0){

            marker.codepostal = "Tout le Québec";

        }
        if(marker.vln == 0){

            $montagnes.append('<h3 class="region-title">' + marker.codepostal + '</h3>');

        }else{

            $montagnes.append('<div class="selector-mountain">' + marker.codepostal + '</div>');

        }

    });

    /* add a click to the list of station */
    $montagnes.children().each(function(){

        $(this).click(function(){

            var $element = $(this);
            var text = $element.text();

            $.each(stationsArray, function(i, marker){

                if(text == marker.data.codepostal){

                    google.maps.event.trigger(marker, 'click');
                    var position = new google.maps.LatLng(marker.data.latitude, marker.data.longitude);
                    map.panTo(position);

                }

            });

            $.each(labelRegionArray, function(i, marker){

                if(text == marker.data.codepostal){

                    zoom = parseInt(marker.data.zoom);
                    var position = new google.maps.LatLng(marker.data.latitude, marker.data.longitude);
                    map.panTo(position);
                    map.setZoom(zoom);

                } else if(text == "Tout le Québec"){

                    var position = new google.maps.LatLng(centerLatitude, centerLongitude);
                    map.panTo(position);
                    map.setZoom(startZoom);

                }

            });

        });

    });

}

$(document).ready(function(){

    $("#filters-map").find(".js-reveal").each(function(){

        $(this).click(function(e){

           var idReveal = $(this).attr("href");
           var containerCtrl =  $("#container-ctrl");
           var reveal =  $(".js-reveal");
           var revealContent =  $(".js-reveal-content");

            e.preventDefault();

               if( idReveal == '#toogle' || $(this).hasClass('is-open')){

                   if(containerCtrl.hasClass('is-open')){

                       containerCtrl.removeClass('is-open');
                       reveal.removeClass('is-open');

                   }else {

                       containerCtrl.addClass('is-open');
                       revealContent.each(function(){

                           if($(this).hasClass("is-open")){

                               var idContent = $(this).attr('id');
                               $('.js-reveal[href="#' + idContent + '"]').addClass('is-open');

                           }

                       })

                   }

               } else {

                   /* close all open tabs */
                   revealContent.hide().removeClass('is-open');
                   reveal.removeClass('is-open');

                   $(idReveal).show().addClass('is-open');
                   $(this).addClass('is-open');
                   containerCtrl.addClass('is-open');

               }

        })

    });

    $("#choix-skitype").find('input[type=radio]').each(function(){

        /* set default value to the UI */
        if($(this).val() == skitype){

            $(this).attr('checked', true);

        }

        $(this).change(function(){

            skitype = $(this).val();
            switchSkiType();
            /* change the style and get the previous zoom and center to not change the position of the map */
            mapOptions.styles = mapStyle;
            mapOptions.center = map.getCenter();
            mapOptions.zoom = map.getZoom();
            map.setOptions(mapOptions);

            $.each(stationsArray, function(i, marker){

                addStatus(marker.data);
                marker.set('visible', setVisibility(marker.data));
                marker.set('classname', getIcone(marker.data));

            });

        });

    });

    $("#choix-cache-regions").find('input[type=checkbox]').change(function(){

        var that = $(this);
        var text = $("#choix-cache-regions").find('.js-text');

        if(that.data('status') == 'hidden'){

            that.data('status', 'visible');
            text.html(that.data('text').visible);

        } else {

            that.data('status', 'hidden');
            text.html(that.data('text').hidden);

        }

        $.each(labelRegionArray, function(i, marker){

            if(that.data('status') == 'hidden'){

                marker.set('visible', false)

            }else if(that.data('status') == 'visible'){

                marker.set('visible', true);

            }

        });

    });

    $("#choix-cache-stations").find('input[type=checkbox]').change(function(){

        var that = $(this);
        var text = $("#choix-cache-stations").find('.js-text');

        if(that.data('status') == 'hidden'){

            that.data('status', 'visible');
            text.html(that.data('text').hidden);
            showClosed = true;

        } else {

            that.data('status', 'hidden');
            text.html(that.data('text').visible);
            showClosed = false;

        }

        $.each(stationsArray, function(i, marker){

            marker.set('visible', setVisibility(marker.data));

        });

    });

    $("#choix-vues").find('input[type=radio]').each(function(){

        $(this).click(function(){

                mode = $(this).data('mode');

                $.each(stationsArray, function(i, marker){

                    /* todo : need to add snowfall icon to works perfectly */
                    marker.set('classname', getIcone(marker.data));

                });

            });

        });

    /* set height of the map and on resize set the new height */
    handleResize();

    $( window ).resize(function() {

        handleResize();

    });

    /* get the markers from a json api */
    $.getJSON(
    	"http://zoneski.com/skimaptw13/jsonp.php?callback=?",
    	function( data ) {

        markers = data;

        if(!markers){

            $('#alert').html( "<p>Erreur de données.</p>" );

        } else {

            afficherStations();
            google.maps.event.addDomListener(window, 'load', initMap());

        }

    }).fail(function() {

            $('#alert').html( "<p>Impossible d\'accéder aux données de la carte.</p>" );

    });

});