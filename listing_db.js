var mongoose = require("mongoose");


	var agentsSchema = new mongoose.Schema(
	    {       
		        "firstName": String,
		        "lastName": String,
		        "middleName": String,
		        "phone": String,
				"email": String,
  			    "officePhones": String,
				"office": String,
		        "primary": Boolean
		}
	);

	var brokerSchema = new mongoose.Schema(
	    {
		        "address": String,
		        "city": String,
		        "id": Number,
		        "name": String,
		        "phones": String,
		        "state": String,
		        "zip": String
		    }
	);

	var listingSchema = new mongoose.Schema(
		{
		        "active": Boolean,
				"accessibility": String,
		        "acres": Number,
		        "addressPostfix": String,
		        "addressPrefix": String,
				"agents" :[mongoose.Schema.Types.ObjectId],
				"unconfirmedAgents":[{
			        "firstName": String,
			        "lastName": String,
			        "middleName": String,
			        "phone": String,
					"email": String,
	  			    "officePhones": String,
					"office": String,
			        "primary": Boolean
				}],
		        "airConditionerType": String,
		        "amenities": String,
		        "animals": String,
		        "area": String,
		        "basement": String,
		        "basementPctFinish": Number,
				"broker" :[mongoose.Schema.Types.ObjectI],
		        "carportCapacity": Number,
		        "city": String,
		        "constructionStatus": String,
		        "coordEW": Number,
		        "coordNS": Number,
		        "county": String,
		        "daysOnMarket": Number,
		        "deck": Number,
		        "dimensionBack": Number,
		        "dimensionFrontage": Number,
		        "dimensionIrregular": String,
		        "dimensionSide": Number,
		        "driveway": String,
		        "envCertification": String,
		        "exclusions": String,
		        "exterior": String,
		        "exteriorFeatures": String,
		        "floorType": String,
		        "frontFace": String,
		        "garageCapacity": Number,
		        "garageType": String,
		        "heatType": String,
		        "hoaFee": Number,
		        "homeType": String,
		        "houseNumber": Number,
		        "id": String,
		        "inclusions": String,
		        "interiorFeatures": String,
		        "landscape": String,
		        "latitude": Number,
		        "levels": [{
					"bar": Number,
		            "bathsFull": Number,
		            "bathsHalf": Number,
		            "bathsThreeQuarter": Number,
		            "beds": Number,
		            "dens": Number,
		            "diningF": Number,
		            "diningS": Number,
		            "familyRooms": Number,
		            "fireplaces": Number,
		            "formalLivingRooms": Number,
		            "kitchenB": Number,
		            "kitchenK": Number,
		            "laundryRooms": Number,
		            "level": String,
		            "squareFeet": Number
		        }],
		        "listType": String,
		        "listingDate": Number,
		        "location": {lon:  Number, lat:  Number},
		        "Numberitude": Number,
		        "lotType": String,
		        "maintFree": String,
		        "masterBedroom": String,
				"otherFeatures": String,
		        "ownerType": String,
		        "parkingCapacity": Number,
		        "patio": Number,
		        "photoCount": Number,
		        "photos": [{
					address: String
				}],
		        "poolType": String,
		        "price": Number,
		        "projectRestrictions": String,
		        "propertyTour": String,
		        "publicId": String,
		        "publicRemarks": String,
		        "quadrant": String,
		        "roofType": String,
		        "schoolDistrict": String,
		        "schools": [{
		            "name": String,
		            "schoolType": String
		        }],
		        "seniorCommunity": String,
		        "shortSale": String,
		        "sourceId": Number,
		        "state": String,
		        "storage": String,
		        "street": String,
		        "streetType": String,
		        "style": String,
		        "subdivision": String,
		        "taxes": Number,
		        "taxid": String,
		        "telcom": String,
		        "timeClause": Number,
		        "totalBaths": Number,
		        "totalBathsFull": Number,
		        "totalBathsHalf": Number,
		        "totalBathsQuarter": Number,
		        "totalBeds": Number,
		        "totalDens": Number,
		        "totalDiningF": Number,
		        "totalDiningS": Number,
		        "totalFamilyRooms": Number,
		        "totalFireplaces": Number,
		        "totalFormalLivingRooms": Number,
		        "totalKitchenB": Number,
		        "totalKitchenK": Number,
		        "totalLaundryRooms": Number,
		        "totalSquareFeet": String,
		        "unitNumber": String,
		        "airConxditionerType": String,      
		        "utilities": String,
		        "waterType": String,
		        "windowType": String,
		        "year": Number,
		        "zip": Number,
		        "zoning": String
		      }
	);
	
	listingSchema.methods.findByZip = function findByZip(thiszip){
		return this.find({zip: thiszip});
	};

	var theListing = mongoose.model('Listing', listingSchema);
	var theAgents = mongoose.model('Agent', agentsSchema);
	var theBroker = mongoose.model('Broker', brokerSchema);


module.exports = {
	theListing: theListing,
	theAgents: theAgents,
	theBroker: theBroker
};