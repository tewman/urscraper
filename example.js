var requests = require("request");
var cheerio  = require("cheerio");
var fs = require("fs");

// var homeUrl = "http://www.realtor.com";
// var zip = "84095";
// var url = homeUrl + "/realestateandhomes-search/" + zip;


var homeU// rl = "http://www.utahrealestate.com/";
// var url = homeUrl + "search/public.search?geocoded=84088&page=2";

 var homeUrl = "http://localhost/~traviswinks/tphtml/public_html/#/listings";
 var url = homeUrl + '';

//foreach zip, get all listings (properties found / 10 = # of pages)
    //foreach each listing, get data
    
var start = Date.now();

setInterval( function(){fetchListings();}, 5000);

function fetchListings(){
    console.log("fetchingListings");
    console.log(url);
    requests(url, function(err, resp, body){
         if(err){
             console.log(err);
         } 
         console.log(resp);
         //    console.log(body);
//              fs.writeFile('/Users/traviswinks/Sites/scrapers/tmp/test.html', body, function(err){
//                 if(err){
//                     console.log(err);   
//                 } else {
//                     console.log("file saved");
//                 }
//              });
             
             $l = cheerio.load(body);           
             
//             $l('.listing').each(function(){
//                 var detailUrl = $l(this).find('div a').attr('href');
//                 requests(homeUrl + detailUrl, function(err, resp, body){
//                     if(err)
//                         throw err;
//                     $ = cheerio.load(body);    
//                     var publicRecords = $('.title-section:contains("Public Records") div');
//                     console.log($(publicRecords).text());
//                 });
//             });   
          
     });

}