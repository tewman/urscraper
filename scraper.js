var Browser = require("zombie");
var cheerio = require("cheerio");
var mongoose = require('mongoose');

mongoose.connect('mongodb://tpUser:over8ed@ds033569.mongolab.com:33569/heroku_app22705925');
//mongoose.connect('mongodb://localhost/realestate');
var Schema = mongoose.Schema;
var db = mongoose.connection;
db.on('open', function(){
	console.log("db connected");
});

var theListing = require("./listing_db").theListing;
var theAgents = require("./listing_db").theAgents;
var theBroker = require("./listing_db").theBroker;
var theError = require("./listing_db").theError;

function async(arg, callback) {
  console.log('do something in \''+arg+'\', seconds');
  setTimeout(function() { 
	  callback(arg); 
  }, 1000 * arg);
}

function final(){
	console.log('Done');
}

var page = 1;
var numPages = 0;

browser = new Browser();
timeout = 10000;

var command = process.argv[2];
console.log("command: " + command)
if(command == '-p' || command == '--page'){
	page = Number(process.argv[3]);
	start();
} else if(command == '-m' || command == '--mls'){
	var mls = Number(process.argv[3]);
	var alistingUrl = "http://www.utahrealestate.com/report/public.single.report/report/detailed/listno/" + mls + "/scroll_to/" + mls;	
	browser.location = alistingUrl;
   	 browser.visit(alistingUrl, { debug: false, runScripts: false, waitFor: 15000 }, function(err){
		 browser.wait(function(){
	   		 if(err){
	   			 console.log("failed to load " + alistingUrl);
	   			 console.log(err);
	   		 } else{
	   	         var body = browser.html('body');
				 console.log(browser.location.toString());						
	   	 		 scrapeDetails(body, mls, function(err){	
					 if(err){
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
} else if(command == '-h' || command == '--help' ){
	console.log("-p or --page: Start on this page");
	console.log("-m or --mls: Scrape this listing with the mls id");
	console.log("-h or --help: This information");
	process.exit();
} else {
	console.log("going to start");
	start();
}

var url = "http://www.utahrealestate.com/search/public.search?accuracy=&geocoded=&box=&htype=&lat=&lng=&geolocation=&type=1&listprice1=&listprice2=&proptype=&state=ut&tot_bed1=&tot_bath1=&tot_sqf1=&dim_acres1=&yearblt1=&cap_garage1=&style=&o_style=4&opens=&accessibility=&o_accessibility=32&sort=listprice%20DESC";
//start here
function start(){
	var url = "http://www.utahrealestate.com/search/public.search?accuracy=&geocoded=&box=&htype=&lat=&lng=&geolocation=&type=1&listprice1=&listprice2=&proptype=&state=ut&tot_bed1=&tot_bath1=&tot_sqf1=&dim_acres1=&yearblt1=&cap_garage1=&style=&o_style=4&opens=&accessibility=&o_accessibility=32&sort=listprice%20DESC";
	browser.visit(url, {debug: false, runScripts: false, waitFor: 6000}, function(){
		var $ = cheerio.load(browser.html('body'), {
			normalizeWhitespace: true
		});	
		numPages = $('#page-selector option').toArray().length;	
		console.log('numPages: ' + numPages);
		series(function(){
			console.log('done start()')
		});
	});
}


//control flow pattern asyncronous loop
function series(callback){
	if(page <= numPages){
		//for each list pages...
		//run 100 seconds per page		
		var time = (page == 1)? 1 : 100; //start in one second on first page. All others take 100 seconds.
		async(time, function(result){
			console.log("WORKING ON LISTINGS PAGE " + page);
			getLists(page);
			page += 1;
			return series();
		});
	} else {
		return final();
	}
}

//get listings on this page
function getLists(page){
	console.log("LISTINGS FOR PAGE " + page);
	var listUrl = url + "&page=" + page;	
	browser.visit(listUrl, {debug: false, runScripts: false, waitFor: 5000}, function(){
		var $$$ = cheerio.load(browser.html('body'), {
			normalizeWhitespace: true
		});
		
		var listings = [];
		
		//get all the listings on the page
		$$$('.view-prop-details').each(function(i, n) {
			var thisTimeout = Math.random() * timeout;
			listings.push($$$(this).find('a').attr('href'));
		});
		
		
		//foreach listing, go to page and scrape it every 10 seconds.		
		getDetails(listings.shift());
	
		function getDetails(listingsUrl){						
			async(7, function(){				
				if(listingsUrl){
					var listingId = listingsUrl.substring(listingsUrl.lastIndexOf("/") + 1);					
					var listingUrl = "http://www.utahrealestate.com" + listingsUrl;	
				   	 browser.visit(listingUrl, { debug: false, runScripts: false, waitFor: 9000 }, function(err){
						 browser.wait(function(){
					   		 if(err){
					   			 console.log("failed to load " + url);
					   			 console.log(err);
					   		 } else{
					   	         var body = browser.html('body');
								 console.log(listingUrl);									 
					   	 		 scrapeDetails(body, listingId, function(err){	
									 if(err){								 		
				 						error = new theError()								 		
				 				 		error.error = err;
				 				 		error.mls = listingId;
				 				 		error.page = page;
				 				 		error.save();
				 				 		console.log(err);
										console.log("Re-scrape " + listingId);
									 } else {
									 	console.log("DONE SCRAPING FOR " + listingId);
								 	}
									 //browser.close();//????????? free memory ??????????
						   	     });				   	 		 
					   		 }
						 });				   		         
				   	 });					
					getDetails(listings.shift());
				} else {					
					return true;
				}
			});
		}
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

	try {
		var someDetails = $('.public-detail-overview-b').contents();
		var mls = someDetails[2].data.trim();
		var proptype = someDetails[6].data;
		var yearBuilt = someDetails[8].data;
		var start = details.indexOf("<span>$");
	} catch (err){		
		callback(new Error(err));
	}
	
	createListing(mls, function(result){
		try {
			var thisListing = result			
			thisListing.price = details.substring(start + 7, details.indexOf("</span>", start)).trim().replace(/,/g,'');
			thisListing.mlsid = 'wurmls' + mls.trim();
			thisListing.homeType = proptype.trim();
			thisListing.year = yearBuilt.trim();		
		} catch (err){		
			callback(new Error(err));
		}
		
		try{
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
		} catch (err){		
			callback(new Error(err));
		}

			//// Square footage	and level infos
			setSqftBRBR(function(err){
				if(err){
					callback(err);
				}
			});
		
			//// schools
			setSchools(function(err){
				if(err){
					callback(err);
				}
			});
		
			//// agent info
			setAgents(function(err){
				if(err){
					callback(err);
				}
			});

			////Interior Features
			setInteriorFeatures(function(err){
				if(err){
					callback(err);
				}
			});
	
			////Exterior Features
			setExteriorFeatures(function(err){
				if(err){
					callback(err);
				}
			});
	
			//// Other Features
			setOtherFeatures(function(err){
				if(err){
					callback(err);
				}
			});
	
			//// Inclusions
			setInclusions(function(err){
				if(err){
					callback(err);
				}
			});	
	
			//// Zoning
			setZoning(function(err){
				if(err){
					callback(err);
				}
			});

			//// Owner type
			setOwnerType(function(err){
				if(err){
					callback(err);
				}
			});
	
			//// Lot size
			setLotSize(function(err){
				if(err){
					callback(err);
				}
			});
	
			//// Photos
			setPhotos(function(err){
				if(err){
					callback(err);
				}
			});
	
			//// save listing
			saveListing(function(){
				callback();
			});
	
			// get and save photo address
			function setPhotos(){
				try{
					var photos = [];
					$('.slide-images').children().each(function(i,n){
						$(n).children().each(function(ii,nn){
							var src = $(nn).attr('src');
							photos.push({address: src});
							//thisListing.photos.push({address: src});
						});
					});
					thisListing.photos = photos;
				} catch (err){		
					callback(new Error(err));
				}
			}
	
			// Set Square Footage and bedroom and bathroom info
			function setSqftBRBR(){
				try{
					var smallestLevel = 100;
					thisListing.levels = new Array(); //overwrites all levels.
				
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
				} catch (err){		
					callback(new Error(err));
				}
				
				try{
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
				} catch (err){		
					callback(new Error(err));
				}
		
				try{
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
				} catch (err){		
					callback(new Error(err));
				}
			}
	
			// Set Schools
			function setSchools(){
				try{
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
				} catch (err){		
					callback(new Error(err));
				}
			}
	
			// Set Agents
			 function setAgents(){				
				 try{
					thisListing.unconfirmedAgents = []; //overwrite all unconfirmed agents
				
			 		var agentInfo = $('.public-agent-wrap tr td p').contents();
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
			 		var agentOfficePhone = (agentInfo[14].type != 'text') ? '' : agentInfo[14].data.trim();
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
				} catch (err){		
					callback(new Error(err));
				}
		 	}
	
			// Exterior Features
			function setExteriorFeatures(){
				try{
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
				} catch (err){		
					callback(new Error(err));
				}
			}

			// Interior Features
			function setInteriorFeatures(){
				try{
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
				} catch (err){		
					callback(new Error(err));
				}
			}

			// Other Features
			function setOtherFeatures(){
				try{
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
				} catch (err){		
					callback(new Error(err));
				}
			}

			// Inclusions
			function setInclusions(){
				try{
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
				} catch (err){		
					callback(new Error(err));
				}
			}

			// Zoning
			function setZoning(){
				try{
					var zoningArray = new Array();
					var zonings = $('h4:contains("Zoning Information")').next().find('li').each(function(i,n){
				    	var zoningInfo = $(this).text();
						var zoningData = new Object();		
						var zoningSplit = zoningInfo.split(":");
						//
						thisListing.zoning = zoningSplit[1].trim();
					});
				} catch (err){		
					callback(new Error(err));
				}
			}

			//// Owner type
			function setOwnerType(){
				try{
					var ownerArray = new Array();
					var owners = $('h4:contains("Owner Type")').next().find('li').each(function(i,n){
				    	var ownerInfo = $(this).text();
						var ownerData = new Object();		
						var ownerSplit = ownerInfo.split(":");
						//
						thisListing.ownerType = (typeof ownerSplit[0] === 'undefined') ? '' : ownerSplit[0].trim();			
					});
				} catch (err){		
					callback(new Error(err));
				}
			}
	
			//lotSize
			function setLotSize(){
				try{
					var lotsizeArray = new Array();
					var lotsize = $('h4:contains("Lot Size In Acres")').next().find('li').each(function(i,n){
				    	var lotsizeInfo = $(this).text();
						var lotsizeData = new Object();		
						var lotsizeSplit = lotsizeInfo.split(":");
						//
						thisListing.acres = (typeof lotsizeSplit[1] === 'undefined') ? '' : lotsizeSplit[1].trim();
						//
					});
				} catch (err){		
					callback(new Error(err));
				}
			}
			
			//save the listing
			function saveListing(callback){	
				try{
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
					});
				} catch (err){		
					callback(new Error(err));
				}
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
// 				console.log(query);
				result = new theListing();
				callback(result);
			}
// 			console.log(result);
				callback(result);
		});
	}
	
	
}