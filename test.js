var geocoderProvider = 'google';
var httpAdapter = "http";
var extras = {};
var geocoder = require('node-geocoder').getGeocoder(geocoderProvider, httpAdapter, extras);

geocoder.geocode("84117", function(err, res){
    console.log("HI");
    console.log(res);
    console.log(err);
});
