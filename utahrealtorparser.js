var util = require('util');

var Browser = require("zombie");
var cheerio = require("cheerio");
var fs = require("fs");
var mongoose = require('mongoose');

var listUrl = '';
var timeout = 0;
var theListing = require("./listing_db").theListing;
//var thisListing = new theListing();
var theAgents = require("./listing_db").theAgents;
//var thisAgent = new theAgents();
var theBroker = require("./listing_db").theBroker;

start();

function start(){
	mongoose.connect('mongodb://localhost/realestate');
	var Schema = mongoose.Schema;
	var db = mongoose.connection;
	db.on('open', function(){
		console.log("db connected");
	});
	

	browser = new Browser();
    timeout = 10000;
	listUrl = "http://www.utahrealestate.com/search/public.search?accuracy=&geocoded=&box=&htype=&lat=&lng=&geolocation=&type=1&listprice1=&listprice2=&proptype=&state=ut&tot_bed1=&tot_bath1=&tot_sqf1=&dim_acres1=&yearblt1=&cap_garage1=&style=&o_style=4&opens=&accessibility=&o_accessibility=32&sort=listprice%20DESC";
	crawl(listUrl, function(){
		console.log("ALL DONE WITH CRAWL");
	});
	
}


function crawl(url, callback){ 
	browser.visit(url, {debug: false, runScripts: false, waitFor: 6}, function(){
		var mainBody = browser.html('body');
		var page = 0;
		var numPages = 0;
		var $ = cheerio.load(mainBody, {
			normalizeWhitespace: true
		});	
		page = 1;//$('#page-selector option:selected').val();			
		numPages = $('#page-selector option').toArray().length;

		numPages = 5; //temp. remove to go live.	
		for(var it = page; it <= numPages; it++){
			var thisurl = listUrl + "&page=" + it;				
			timeout += Math.random() * timeout;
			setInterval(function(){	
				//console.log("STEP 1: page: " + it + " numPages: " + numPages);			
				scrape(thisurl, timeout, function(){
					console.log("DONE WITH: " + thisurl);
				});
			}, timeout * 5);					 				
		}
		
	});	
}

//get the pages list of real estates listings
function scrape(url, delay, callback){
	delay = delay + 10000;
	setTimeout(function(){
		//console.log("STEP 2");
		browser.visit(url, {debug: false, runScripts: false, waitFor: 3}, function(){
			var body = browser.html('body');
			getPageListDetails(body, function(){
				console.log("DONE SCRAPING: " + url);
				callback();
			});
		});
	}, delay);
}


//get details for each list on page
function getPageListDetails(mainBody, callback){
	//console.log("STEP 3");
	var $$$ = cheerio.load(mainBody, {
		normalizeWhitespace: true
	});
	
	//go to all the listings' details on the page
	$$$('.view-prop-details').each(function(i, n) {
		var thisTimeout = Math.random() * timeout;
		getData($$$(this).find('a').attr('href'), thisTimeout, function(){
			console.log("done with a getPageListDetails");
			callback();
		});
		
	});	
}

//prepare a call with a delay
function getData(listing, delay, callback) {
	//console.log("STEP 4");
	var listingUrl = listing;
	var listingId = listingUrl.substring(listingUrl.lastIndexOf("/") + 1);
	setTimeout(function() {
		callDetailsUrl(listingUrl, listingId, function(){
			console.log("DOONNEE WWIITTHH " + listingId);
			callback();
		});
	}, delay);
	
}

//get the body of the listing and call the scrapeDetails function
function callDetailsUrl(listingUrl, listingId, callback) {
	//console.log("STEP 5");
	 var url = "http://www.utahrealestate.com" + listingUrl;    
	 browser.visit(url, { debug: false, runScripts: false, waitFor: 10 }, function(err){
		 if(err){
			 console.log("failed to load " + url);
			 console.log(err);
		 }
		 browser.wait(function(){
	         var body = browser.html('body');
	 		 scrapeDetails(body, listingId, function(){
	 		 console.log("Done with callDetailsUrl...");
			 callback();
	 	    });
		 });        
	 });	  
}

//scrape the listing's page for listing info
function scrapeDetails(body, listingId, callback) { 
	console.log("SCRAPING: " + listingId);
	var thisAgent = new theAgents();
	var thisBroker = new theBroker();
	
	var data = new Array();

	$ = cheerio.load(body, {
		normalizeWhitespace: true
	});
	
	var details = $('h2.public-detailed').html();
	
	//// Price, Address, MLS #, Type and style, year built
	//console.log(details);
 	console.log(browser.xpath("//div[@id='public-report-wrap']/table/tbody/tr/td/table/tbody/tr[2]/td/p[2]"));
	var someDetails = $('.public-detail-overview-b').contents();
	var mls = someDetails[2].data.trim();
	var proptype = someDetails[6].data;
	var yearBuilt = someDetails[8].data;
	var start = details.indexOf("<span>$");
	
	createListing(mls, function(result){
			var thisListing = result			
			thisListing.price = details.substring(start + 7, details.indexOf("</span>", start)).trim().replace(/,/g,'');
			thisListing.mlsid = 'wurmls' + mls.trim();
			thisListing.homeType = proptype.trim();
			thisListing.year = yearBuilt.trim();
	
	

			var loct = $('.view-map>a').attr('onclick');
			var addinfo = loct.split('/');
			for(var i in addinfo){
				if(addinfo[i] == 'add'){
					i++;
					thisListing.street = decodeURIComponent(addinfo[i]).replace(/\+/g, ' ');			
				} else if(addinfo[i] == 'city'){
					i++;
					thisListing.city = decodeURIComponent(addinfo[i]).replace(/\+/g, ' ');			
				} else if(addinfo[i] == 'state'){
					i++;
					thisListing.state = decodeURIComponent(addinfo[i]).replace(/\+/g, ' ');			
				} else if(addinfo[i] == 'zip'){
					i++;
					var tmpzip = decodeURIComponent(addinfo[i]).substr(0, addinfo[i].indexOf("'"));
					thisListing.zip = tmpzip;						
				} else if(addinfo[i] == 'lat'){
					i++;
					thisListing.location.lat = addinfo[i];
				} else if(addinfo[i] == 'lng'){
					i++;			
					thisListing.location.lon = addinfo[i];
				}
			}
	
	


			//// Square footage	and level infos
			setSqftBRBR();
		
			//// schools
			setSchools();
		
			//// agent info
			setAgents();

			////Interior Features
			setInteriorFeatures();
	
			////Exterior Features
			setExteriorFeatures();
	
			//// Other Features
			setOtherFeatures();
	
			//// Inclusions
			setInclusions();	
	
			//// Zoning
			setZoning();

			//// Owner type
			setOwnerType();
	
			//// Lot size
			setLotSize();
	
			//// Photos
			setPhotos();
	
			//// save listing
			saveListing(function(){
				callback();
			});
	
			// get and save photo address
			function setPhotos(){
				var photos = [];
				$('.slide-images').children().each(function(i,n){
					$(n).children().each(function(ii,nn){
						var src = $(nn).attr('src');
						photos.push({address: src});
						//thisListing.photos.push({address: src});
					});
				});
				thisListing.photos = photos;
			}
	
			// Set Square Footage and bedroom and bathroom info
			function setSqftBRBR(){
				var smallestLevel = 100;
		
				//sqft per floor
				//will created a level object for each floor
				var squareFeetPerFloor = $('h4:contains("Square Feet On Each Floor")').next().find('li').each(function(i,n){			
					var sqft = $(this).html().trim();
					var sqftSplit = sqft.split(': ');
			
					if(sqftSplit[0] == 'Total'){
						thisListing.totalSquareFeet = sqftSplit[1];
					} else {
						var newLevel = new Object();
						newLevel.squareFeet = sqftSplit[1].substring(0, sqftSplit[1].indexOf(' '));
						newLevel.level = sqftSplit[0];	
						thisListing.levels.push(newLevel);				
					}					
				});
		
				//bedrooms
				var rooms = $('h4:contains("Rooms Include")').next();
				rooms.find('li').html().trim().
					substring(0, rooms.find('li').html().trim().indexOf(" Total Bedrooms"));

				$('ul li:contains("Bedrooms")').next().children().each(function(i, n) {
		 		    var levelName = '';
					var splitRooms = ($(n).html()).split(':');			
					var level = splitRooms[0];						
					var bedNum = splitRooms[1].trim();
					//find the level, add the bedroom and number
					for(var i in thisListing.levels){
						if(thisListing.levels[i].level == level){
							thisListing.levels[i].beds = bedNum
						}
					}
				});
		
				//bathrooms		
				$('ul li:contains("Bathrooms")').html().trim().
					substring(0, $('ul li:contains("Bathrooms")').html().trim().indexOf(" Total Bathrooms"));
		
				var allBathrooms = new Object();
				var bathrooms = $('ul li:contains("Bathrooms")').next().children().each(function(i, n) {
					var splitRooms = ($(n).html()).split(':');			
					var level = splitRooms[0].trim();
		
					var bathroom = splitRooms[1].trim();
					bathroomNum = bathroom.substring(0, bathroom.indexOf(' '));
					bathroomType = bathroom.substring(bathroom.indexOf(' ')).trim();

					if(bathroomType == 'Full'){ bathroomType = 'bathsFull'} else
					if(bathroomType == 'Half'){ bathroomType = 'bathsHalf'} else
					{(bathroomType = 'bathsThreeQuarter');}
					//find the level, add the rooms and number
					for(var i in thisListing.levels){
						if(thisListing.levels[i].level == level){
							thisListing.levels[i][bathroomType] = bathroomNum
						}
					}			
				});
		
				//other rooms
				var numOtherRooms = $('ul li:contains("Other Rooms")').next().children().each(function(i, n) {
					//get floors
					var floors = $(n).html().trim().split(/[:]/g);
					var where = floors[0]
					var roomsFloor = floors[1]
					var floorRooms = roomsFloor.split(/[;*]/g);

					//data['otherRooms'] = new Array();
					var dataFloor = new Object();
					var dataFloorRooms = new Array();


					for (var i in floorRooms) {
						if (typeof floorRooms[i] !== 'undefined' && floorRooms[i] != '') {
							var roomm = new Object();
							var roommNum = floorRooms[i].substring(0, floorRooms[i].trim().indexOf(' ') + 1);
							var roommName = (floorRooms[i].substring(floorRooms[i].trim().indexOf(' ') + 1)).trim();
							if(roommName == 'Family Rm(s)'){
								roommName = 'familyRooms';
							} else if(roommName == 'Kitchen(s)'){
								roommName = 'kitchenB';
							} else if(roommName == 'Laundry Rm(s)'){
								roommName = 'laundryRooms';
							} else if(roommName == 'Formal Living'){
								roommName = 'formalLivingRooms';
							} else if(roommName == 'Formal Dining'){
								roommName = 'diningF';
							} else if(roommName == 'Semiformal Dining'){
								roommName = 'diningS';
							} else if(roommName == 'Bar(s)'){
								roommName = 'bar';
							} else if(roommName == 'Den(s)'){
								roommName = 'dens';
							} else if(roommName == 'fireplace(s)'){
								roommName = 'fireplaces';
							}
							//find the level, add the room and number
							for(var i in thisListing.levels){
								if(thisListing.levels[i].level == where){
									thisListing.levels[i][roommName] = roommNum
								}
							}
						}
					}
				});
			}
	
			// Set Schools
			function setSchools(){
				thisListing.schools = new Array();
				var schoolsArray = new Array();
				var schools = $('h4:contains("Local Schools")').next().find('li').each(function(i,n){		
			    	var schoolInfo = $(this).text();					
					var schoolSplit = schoolInfo.split(":");

					var schoolData = new Object();
					schoolData.schoolType = schoolSplit[0].trim();
					schoolData.name = schoolSplit[1].trim();	
					thisListing.schools.push(schoolData);
				});
			}
	
			// Set Agents
			 function setAgents(){
		 		var agentInfo = $('.public-agent-wrap tr td p').contents();
				//console.log(agentInfo);
		 		var agent = agentInfo[3].data.trim();
		 		// seperate names
		 		agent = agent.split(' ');
		 		var agentFirstName = agent[0];
		 		var agentLastName = agent[agent.length - 1];
		 		var agentMiddleName = '';
		 		if(agent.length == 3){
		 			agentMiddleName = agent[1];
		 		}
		 		var agentPhone = agentInfo[7].data.trim();
		 		var agentOfficePhone = (agentInfo[14].data == null)? '' : agentInfo[14].data.trim();
		 		var agentEmail = 'n/a';
		 		newAgent = new Object();
				newAgent.firstName = agentFirstName;
			    newAgent.lastName =  agentLastName;
		        newAgent.middleName = agentMiddleName;
		        newAgent.phone = agentPhone;
				newAgent.email = agentEmail;
			    newAgent.officePhones = agentOfficePhone;
			 	newAgent.office = '';
		        newAgent.primary = true;
		
				thisListing.unconfirmedAgents.push(newAgent);				
		 	}
	
			// Exterior Features
			function setExteriorFeatures(){
				var exteriorArray = new Array();
				var exterior = $('h4:contains("Exterior Features Include")').next().find('li').each(function(i,n){
			    	var exteriorInfo = $(this).text();
					var exteriorData = new Object();		
					var exteriorSplit = exteriorInfo.split(":");
					var typeObject = exteriorSplit[0].trim();
					var infoObject = (typeof exteriorSplit[1] === 'undefined') ? '' : exteriorSplit[1].trim();
					exteriorData = typeObject + ": " + infoObject;
					exteriorArray.push(exteriorData);
				});
				//
				thisListing.exteriorFeatures = exteriorArray.join('; ');
			}

			// Interior Features
			function setInteriorFeatures(){
				var interiorArray = new Array();
				var interior = $('h4:contains("Interior Features Include")').next().find('li').each(function(i,n){
			    	var interiorInfo = $(this).text();
					var interiorData = new Object();		
					var interiorSplit = interiorInfo.split(":");
					var typeObject = interiorSplit[0].trim();
					var infoObject =  (typeof interiorSplit[1] === 'undefined') ? '' : interiorSplit[1].trim();
					interiorData = typeObject + ": " + infoObject;
					interiorArray.push(interiorData);
				});
				//
				thisListing.interiorFeatures = interiorArray.join('; ');
			}

			// Other Features
			function setOtherFeatures(){
				var otherArray = new Array();
				var other = $('h4:contains("Other Features Include")').next().find('li').each(function(i,n){
			    	var otherInfo = $(this).text();
					var otherData = new Object();		
					var otherSplit = otherInfo.split(":");
					var typeObject = otherSplit[0].trim();
					var infoObject = (typeof otherSplit[1] === 'undefined') ? '' : otherSplit[1].trim();
					otherData = typeObject + ": " + infoObject;
					otherArray.push(otherData);
				});
				//
				thisListing.otherFeatures = otherArray.join('; ');
			}

			// Inclusions
			function setInclusions(){
				var inclusionsArray = new Array();
				theInclusionArray = new Array();
				var inclusions = $('h4:contains("Inclusions")').next().find('li').each(function(i,n){
			    	var inclusionsInfo = $(this).text();
					var inclusionsData = new Object();		
					var inclusionsSplit = inclusionsInfo.split(":");
					inclusionsData['type'] = inclusionsSplit[0].trim();		
					inclusionsArray.push(inclusionsData);
					theInclusionArray.push(inclusionsSplit[0]);
				});
				//
				thisListing.inclusions = theInclusionArray.join("; ");
			}

			// Zoning
			function setZoning(){
				var zoningArray = new Array();
				var zonings = $('h4:contains("Zoning Information")').next().find('li').each(function(i,n){
			    	var zoningInfo = $(this).text();
					var zoningData = new Object();		
					var zoningSplit = zoningInfo.split(":");
					//
					thisListing.zoning = zoningSplit[1].trim();
				});
			}

			//// Owner type
			function setOwnerType(){
				var ownerArray = new Array();
				var owners = $('h4:contains("Owner Type")').next().find('li').each(function(i,n){
			    	var ownerInfo = $(this).text();
					var ownerData = new Object();		
					var ownerSplit = ownerInfo.split(":");
					//
					thisListing.ownerType = (typeof ownerSplit[0] === 'undefined') ? '' : ownerSplit[0].trim();			
				});
			}
	
			//lotSize
			function setLotSize(){
				var lotsizeArray = new Array();
				var lotsize = $('h4:contains("Lot Size In Acres")').next().find('li').each(function(i,n){
			    	var lotsizeInfo = $(this).text();
					var lotsizeData = new Object();		
					var lotsizeSplit = lotsizeInfo.split(":");
					//
					thisListing.acres = (typeof lotsizeSplit[1] === 'undefined') ? '' : lotsizeSplit[1].trim();
					//
				});
			}
			
			//save the listing
			function saveListing(callback){	
				console.log("SAVING...SAVING...SAVING...SAVING...SAVING...SAVING...SAVING...SAVING...")	
				thisListing.save(function(err, listing){
					if(err){
						console.log("Error saving the listing");
						console.log(err);
						console.log(thisListing);
					} else {
						thisListing._id = listing._id;
						callback();
					}
				})
			}
	});
	
	
	//if a listing already exists, that is the listing and will be updated. Otherwise, start a new one.
	function createListing(mls, callback){
		var thisid = 'wurmls' + mls;
		var query = theListing.findOne({'mlsid': thisid});		
		theListing.findOne({mlsid: thisid}, function(error, result){
			if(error) {
				console.log(query);
				console.log(error);
				result = handleError(error);				
				callback(result);
			}
			if(result == null){				
				console.log("NO LISTING FOUND, CREATING A NEW ONE FOR: " + thisid);
				console.log(query);
				result = new theListing();
				callback(result);
			}
// 			console.log(result);
				callback(result);
		});
	}
	
	
}
