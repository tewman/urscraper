var Browser = require("zombie");
var cheerio = require("cheerio");
var mongoose = require('mongoose');

//mongoose.connect('mongodb://tpUser:over8ed@ds033569.mongolab.com:33569/heroku_app22705925');
mongoose.connect('mongodb://localhost/realestate');
var Schema = mongoose.Schema;
var db = mongoose.connection;
db.on('open', function() {
    console.log("db connected");
});

var geocoderProvider = 'google';
var httpAdapter = "http";
var extras = {};
var geocoder = require('node-geocoder').getGeocoder(geocoderProvider, httpAdapter, extras);

geocoder.geocode("84117", function(err, res){
    console.log("HI");
    console.log(res);
    console.log(err);
});
process.exit();

//var lastHeap = null
//var memwatch = require('memwatch')
//memwatch.on('stats', function(info) {
//    if (lastHeap) {
//        var hd = lastHeap.end();
//        console.log(JSON.stringify(hd, null, '  '));
//    }
//    console.log("base: " + (info.current_base / 1024 / 1024).toFixed(1) + "  M fullGCs: " + info.num_full_gc + "  incrGCs: " + info.num_inc_gc);
//    console.log("TREND: " + info.usage_trend + "  EB: " + info.estimated_base / 1024 / 1024);
//    lastHeap = new memwatch.HeapDiff();
//});
//
//memwatch.on('leak', function(info) {
//    console.log(info);
//});


var kslListing = require("./ksl_listing_db").kslListing;
var theError = require("./ksl_listing_db").theError;

function async(arg, callback) {
    console.log('do something in \'' + arg + '\', seconds');
    setTimeout(function() {
        callback(arg);
    }, 1000 * arg);
}

function final() {
    console.log('Done');
}

var page = 1;
var numPages = 0;

browser = new Browser();
timeout = 10000;
var runFirst = true;


//command line 
var command = process.argv[2];
console.log("command: " + command)
if (command == '-p' || command == '--page') {
    page = Number(process.argv[3]);
    start();
} else if (command == '-m' || command == '--mls') {
    var mls = Number(process.argv[3]);
    var alistingUrl = "http://www.utahrealestate.com/report/public.single.report/report/detailed/listno/" + mls + "/scroll_to/" + mls;
    browser.location = alistingUrl;
    browser.visit(alistingUrl, {debug: false, runScripts: false, waitFor: 15000}, function(err) {
        browser.wait(function() {
            if (err) {
                console.log("failed to load " + alistingUrl);
                console.log(err);
            } else {
                var body = browser.html('body');
                console.log(browser.location.toString());
                scrapeDetails(body, mls, function(err) {
                    if (err) {
                        error = new theError()
                        error.error = err;
                        error.mls = mls;
                        error.page = page;
                        error.save();
                        console.log(err);
                        console.log("Re-scrape " + mls);
                        process.exit(1);
                    } else {
                        console.log("DONE SCRAPING FOR " + mls);
                    }
                    //browser.close();//????????? free memory ??????????
                });
            }
        });
    });
} else if (command == '--list') {
    var lists = process.argv[3].split(',');

    var listings = [];
    for (var i in lists) {
        listings.push("http://www.ksl.com/index.php?nid=475&ad=" + lists[i] + "&cat=&lpid=&type=0&city=&zipcode=84117&distance=&sale=1&start=&end=&state=0&sort=&keyword=&sqftstart=&sqftend=&acresstart=&acresend=&bedrooms=&bathrooms=&sellertype=&ad_cid=1");
    }
    getDetails(listings.shift());

    function getDetails(listingsUrl) {
        if (listingsUrl) {
            console.log("listingsUrl: " + listingsUrl);
            listingIds = listingsUrl.split('&');
            listingId = listingIds[1].substring(3);
            listingId = (' ' + listingId).substring(1);            
            listingUrl = listingsUrl;
            console.log("getDetails listingUrl: " + listingUrl);
            browser.location = listingUrl;
            browser.visit(listingUrl, {debug: false, runScripts: false, waitFor: 9000}, function(err) {
                browser.wait(function() {
                    if (err) {
                        console.log("failed to load " + url);
                        console.log(err);
                    } else {
                        body = browser.html('body');
                        //console.log(listingUrl);
                        scrapeDetails(body, listingId, function(err) {
                            if (err) {
                                error = new theError()
                                error.error = err;
                                error.mls = listingId;
                                error.page = page;
                                error.save();
                                console.log(err);
                                console.log("Re-scrape " + listingId);
                            } else {
                                console.log("DONE SCRAPING FOR " + listingId);
                                getDetails(listings.shift());
                            }
                        });
                    }
                });
            });            
        } else {
            return true;
        }

    }
} else if (command == '-h' || command == '--help') {
    console.log("-p or --page: Start on this page");
    console.log("-m or --mls: Scrape this listing with the mls id");
    console.log("-h or --help: This information");
    process.exit();
} else {
    console.log("going to start");
    start();
}

var url = "http://www.ksl.com/index.php?sid=5017903&nid=651&type=0&city=&zipcode=84117&distance=&sale=1&start=&end=&state=0&sort=&keyword=&sqftstart=&sqftend=&acresstart=&acresend=&bedrooms=&bathrooms=&sellertype=";
//start here
function start() {
    url = "http://www.ksl.com/index.php?sid=5017903&nid=651&type=0&city=&zipcode=84117&distance=&sale=1&start=&end=&state=0&sort=&keyword=&sqftstart=&sqftend=&acresstart=&acresend=&bedrooms=&bathrooms=&sellertype=";
    browser.visit(url, {debug: false, runScripts: false, waitFor: 6000}, function() {
        var $ = cheerio.load(browser.html('body'), {
            normalizeWhitespace: true
        });
        var results = $('#pagination').text();
        numPages = Math.ceil(results.substring(0, results.indexOf("results")).trim() / 15);
        //console.log('numPages: ' + numPages);
        series(function() {
            //console.log('done start()')
        });
    });
}


//control flow pattern asyncronous loop
function series(callback) {
    if (page <= numPages) {
        //for each list pages...
        //run 150 seconds per page		
        var time = (runFirst === true) ? 1 : 150; //start in one second on first run. All others take 100 seconds.
        async(time, function(result) {
            console.log("WORKING ON LISTINGS PAGE " + page);
            getLists(page);
            page += 1;
            runFirst = false;
            //clear all intances of browser
            return series();
        });
    } else {
        return final();
    }
}

//get listings on this page
function getLists(page) {
    console.log("LISTINGS FOR PAGE " + page);

    var listUrl = url + "&pid=" + page;
    console.log("getLists' url: " + listUrl);
    browser.visit(listUrl, {debug: false, runScripts: false, waitFor: 5000}, function() {
        var $$$ = cheerio.load(browser.html('body'), {
            normalizeWhitespace: true
        });

        var listings = [];
        var thisTimeout = Math.random() * timeout;
        //get all the listings on the page
        $$$('.adBox>.detailBox>.adTitle').each(function(i, n) {
            listings.push($$$(this).find('a').attr('href'));
        });

        console.log("THE LISTINGS");
        console.log(listings);
        //foreach listing, go to page and scrape it every 10 seconds.		
        getDetails(listings.shift());

        function getDetails(listingsUrl) {
            async(7, function() {
                if (listingsUrl) {
                    console.log("listingsUrl: " + listingsUrl);
                    listingIds = listingsUrl.split('&');
                    listingId = listingIds[1].substring(3);
                    listingId = (' ' + listingId).substring(1);
                    listingUrl = "http://www.ksl.com/index.php" + listingsUrl;
                    console.log("getDetails listingUrl: " + listingUrl);
                    //listingsUrl
                    browser.visit(listingUrl, {debug: false, runScripts: false, waitFor: 9000}, function(err) {
                        browser.wait(function() {
                            if (err) {
                                console.log("failed to load " + url);
                                console.log(err);
                            } else {
                                body = browser.html('body');
                                console.log(listingUrl);
                                scrapeDetails(body, listingId, function(err) {
                                    if (err) {
                                        error = new theError()
                                        error.error = err;
                                        error.mls = listingId;
                                        error.page = page;
                                        error.save();
                                        console.log(err);
                                        console.log("Re-scrape " + listingId);
                                    } else {
                                        console.log("DONE SCRAPING FOR " + listingId);
                                        getDetails(listings.shift());
                                    }
                                });
                            }
                        });
                    });                    
                } else {
                    return true;
                }
            });
        }
    });
}

//scrape the listing's page for listing info
function scrapeDetails(body, listingId, callback) {
    var price = '';
    var addressDetails = '';
    var address = '';
    var cityStateZip = '';
    var regCityStateZip = '';
    var cityStateZip = '';
    var city = '';
    var state = '';
    var zip = '';
    var lat = '';
    var lng = '';
    var details = '';
    var sqft = '';
    var acreage = '';
    var builtin = '';
    var bedrooms = '';
    var bathrooms = '';
    var cooling = '';
    var heating = '';
    var seller = '';
    var sellerPhone = '';

    var generalDescription = '';
    try {
        console.log("SCRAPING: " + listingId);

        $ = cheerio.load(body, {
            normalizeWhitespace: true
        });

        //price
        price = $('.productPriceBox').text().trim();
        price = price.substring(1, price.length - 2).replace(/,/g, '');
        price = (' ' + price).substring(1);

        //address
        addressDetails = $('.productContentLoc').html();
        if (addressDetails == null) {
            console.log(body);
        }
        //console.log("addressDetails: " + addressDetails);
        addressDetails = addressDetails.split('<br>');
        address = addressDetails[0].trim();
        cityStateZip = addressDetails[1].trim();
        regCityStateZip = /([\w ]*),\s(\w\w)\s*[&\w;\s*]*(\d{5})/;
        cityStateZip = regCityStateZip.exec(cityStateZip);
        if (regCityStateZip.test(cityStateZip)) {
            city = cityStateZip[1];
            state = cityStateZip[2];
            zip = cityStateZip[3];
        } else {
            regCityStateZip = /(\w*) &nbsp; (\d{5})/;
            if (regCityStateZip.test(cityStateZip)) {
                var regZip = /d{5}/;
                //check 1 then 2
                if (cityStateZip[1].length == 2) {
                    state == cityStateZip[1];
                }
                if (regZip.test(cityStateZip[1])) {
                    zip = cityStateZip[1];
                } else {
                    city = cityStateZip[1];
                }

                if (cityStateZip[2].length == 2) {
                    state == cityStateZip[2];
                } else if (regZip.test(cityStateZip[2])) {
                    zip = cityStateZip[2];
                } else {
                    city = cityStateZip[2];
                }
            }
        }


        //latitude longitude
        lat = '';
        lng = '';
        var regLatLng = /\((\-?\d+.\d+),(\-?\d+.\d+)/;
        if (regLatLng.test(addressDetails[2])) {
            var latLng = regLatLng.exec(addressDetails[2]);
            lat = latLng[1];
            lng = latLng[2];
        }

        //details
        details = $('#productRightCol').find('h5').text("Property Details").next().html().split('<br>');
        var regSqFt = /(\d+ Sq. Ft.)/;
        var regLand = /([\d*]?.?\d* Acres)/;
        var regBuilt = /(Built in )(\d*)/;
        var regBedrooms = /(\d*) (Bedrooms)/;
        var regBathrooms = /(\d*.?\d*) (Bathrooms)/;
        var regCooling = /([a-zA-Z\s]*)(Cooling)/;
        var regHeating = /([a-zA-Z\s]*)(Heating)/;

        for (i in details) {
            if (regSqFt.test(details[i])) {
                sqft = regSqFt.exec(details[i]);
                sqft = sqft[1];
            }
            if (regLand.test(details[i])) {
                acreage = regLand.exec(details[i]);
                acreage = acreage[1];
            }
            if (regBuilt.test(details[i])) {
                builtin = regBuilt.exec(details[i]);
                builtin = builtin[2];
            }
            if (regBedrooms.test(details[i])) {
                bedrooms = regBedrooms.exec(details[i]);
                bedrooms = bedrooms[1];
            }
            if (regBathrooms.test(details[i])) {
                bathrooms = regBathrooms.exec(details[i]);
                bathrooms = bathrooms[1];
            }
            if (regCooling.test(details[i])) {
                cooling = regCooling.exec(details[i]);
                cooling = cooling[1].trim();
            }
            if (regHeating.test(details[i])) {
                heating = regHeating.exec(details[i]);
                heating = heating[1].trim();
            }
        }

        //general description...saving for later reference
        generalDescription = $('.productContentText').text().trim();

        //seller info. seller's first name only
        seller = $('.productContactName').text().trim();
        var regPhone = /(\d{3}-\d{3}-\d{4})/;
        sellerPhone = $('.productContactPhone').text();
        if (regPhone.test(sellerPhone)) {
            sellerPhone = regPhone.exec(sellerPhone);
            sellerPhone = sellerPhone[1];
        } else {
            sellerPhone = '';
        }

        //// Price, Address, MLS #, Type and style, year built	
    } catch (err) {
        console.log(err.stack);
        callback(err);
    }

    createListing(address, city, function(result) {
        try {
            var thisListing = result;
            thisListing.address = address;
            thisListing.city = city;
            thisListing.state = state;
            thisListing.zip = zip;
            thisListing.price = price;
            thisListing.latitude = lat;
            thisListing.longitude = lng;
            thisListing.location = {lng: lng, lat: lat};
            thisListing.totalSquareFeet = sqft;
            thisListing.acres = acreage;
            thisListing.year = builtin;
            thisListing.totalBeds = bedrooms;
            thisListing.totalBaths = bathrooms;
            thisListing.airConditionerType = cooling;
            thisListing.heatType = heating;
            thisListing.generalDescription = generalDescription;
            thisListing.unconfirmedAgents = [{name: seller, phone: sellerPhone}];
            thisListing.sourceId = listingId;
        } catch (err) {
            callback(err);
        }

        saveListing(function() {
            callback();
        });

        //save the listing
        function saveListing(callback) {
            try {
                console.log("SAVING...SAVING...SAVING...SAVING...SAVING...SAVING...SAVING...SAVING...")
                thisListing.save(function(err, listing) {
                    if (err) {
                        console.log("Error saving the listing");
                        console.log(err);
                        console.log(thisListing);
                    } else {
                        thisListing._id = listing._id;
                        callback();
                    }
                });
            } catch (err) {
                callback(err);
            }
        }
    });


    //if a listing already exists, that is the listing and will be updated. Otherwise, start a new one.
    function createListing(address, city, callback) {
        var query = kslListing.findOne({'address': address, 'city': city});
        kslListing.findOne({'address': address, 'city': city}, function(error, result) {
            if (error) {
                console.log(query);
                console.log(error);
                result = handleError(error);
                callback(result);
            }
            if (result == null) {
                console.log("NO LISTING FOUND, CREATING A NEW ONE FOR: " + address + ', ' + city);
// 				console.log(query);
                result = new kslListing();
                callback(result);
            }
// 			console.log(result);
            callback(result);
        });
    }


}