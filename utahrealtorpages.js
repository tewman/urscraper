var Browser = require("zombie");
var cheerio  = require("cheerio");
var fs = require("fs");

browser = new Browser();

//browser.visit("http://localhost/~traviswinks/tphtml/public_html/#/listings", { debug: false, runScripts: false }).
browser.visit("http://www.utahrealestate.com/search/public.search?accuracy=&geocoded=&box=&htype=&lat=&lng=&geolocation=&type=1&listprice1=&listprice2=&proptype=&state=ut&tot_bed1=&tot_bath1=&tot_sqf1=&dim_acres1=&yearblt1=&cap_garage1=&style=&o_style=4&opens=&accessibility=&o_accessibility=32&sort=listprice%20DESC", { debug: false, runScripts: false }).
then(function(){

    console.log(browser.text("title"));
//    browser.fill("location", "84095").
    // browser.fill("geolocation", "84095").
 //        pressButton('#search-button', function(){
 //            console.log("pressed submit");
 //            console.log(browser.location);   
            var body = browser.html('body');            
            $l =  cheerio.load(body);        
            fs.writeFile('/Users/traviswinks/Sites/scrapers/tmp/test.html', browser.html('body'), function(err){
                 if(err){
                     console.log(err);   
                 } else {
                     console.log("file saved");
                 }
              });
          console.log($l('#location').val());    
              
        // });
    
    
}).
fail(function(err){
    console.log(err);
});


function pageLoaded(window) {
        return window.document.querySelector(".container");
    }

