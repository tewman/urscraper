var listings = new Object();
listings = {
	"start": "end",
"levels": [{
    "bathsFull": 1,
    "bathsHalf": 1,
    "bathsThreeQuarter": 1,
    "beds": 1,
    "dens": 1,
    "diningF": 1,
    "diningS": 1,
    "familyRooms": 1,
    "fireplaces": 1,
    "formalLivingRooms": 1,
    "kitchenB": 1,
    "kitchenK": 1,
    "laundryRooms": 1,
    "level": 'Level 1',
    "squareFeet": 1234
},
{
	"bathsFull": 2,
    "bathsHalf": 2,
    "bathsThreeQuarter": 2,
    "beds": 2,
    "dens": 2,
    "diningF": 2,
    "diningS": 2,
    "familyRooms": 2,
    "fireplaces": 2,
    "formalLivingRooms": 2,
    "kitchenB": 2,
    "kitchenK": 2,
    "laundryRooms": 2,
    "level": "Level 2",
    "squareFeet": 1}
]};

console.log(listings);
listings = enterListingLevelInfo(listings, 'test1', 'workr!', 'Level 1');
console.log(listings);

function enterListingLevelInfo(listingInfo, listingKey, listingValue, levelName){
	console.log(listings);
	if(typeof listings.levels === 'undefined' || listings.levels.length == 0){
		listings.levels.push(new Object());
		listings.level[0][listingName] = listingValue;
	} else {   		
		for(var i in listings.levels){
			if(listings.levels[i].level == levelName){
				listings.levels[i][listingKey] = listingValue;				
			}
		}
	}
}