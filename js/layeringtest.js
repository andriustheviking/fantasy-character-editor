//for OSX: open -a 'Google Chrome.app' --args --disable-web-security --allow-file-access-from-files
//for windows: C:\Program Files (x86)\Google\Chrome\Application\chrome.exe --allow-file-access-from-files --disable-web-security
 
 var slotObj = {}, slotTree = {}, assetObj = {}, trimObj = {};

$.ajax ({
	type: "GET",
	url: "./csv/slots.csv",
	dataType: "text",

	success: function (data) { //create an object treee of the slots of the character from slots.csv

		slotObj = csvToObj(data, 'slot');

		for( var x in slotObj) {

			slotObj[x].assetEquipped = "";
			slotObj[x].trimsEquipped = [];

			var xParent = slotObj[x].parent;

			if(!slotObj.hasOwnProperty(x)) continue; //don't include primitive prototypes

			//add root slots to tree
			if( xParent == "root"){
				slotTree[x] = slotObj[x]; //insert object for slot x into property x of slotTree
			}
			else {
				if(slotObj[x].order < 0){ //if the order of the object of x is <1, then it goes in children.Below of its parent slot
					if(!slotObj[xParent].childrenBelow){ //if x's parent doesn't have childrenBelow, create childrenBelow array
						slotObj[xParent].childrenBelow = [];
					}
					slotObj[xParent].childrenBelow[Math.abs(slotObj[x].order)] = slotObj[x]; //link x to childrenBelow array according to its order property
				}
				else {
					if(!slotObj[xParent].childrenAbove){ //if x's parent doesn't have childrenAbove create childrenAbove array
						slotObj[xParent].childrenAbove = [];
					}
					slotObj[xParent].childrenAbove[slotObj[x].order] = slotObj[x]; //link x to childrenAbove array according to its order property
				}
			}
		}
	
		//get asset info and attach to slot tree
		$.ajax({
			type: "GET",
			url: "./csv/asset info.csv",
			dataType: "text",
			success: function (data) {

				assetObj = csvToObj(data, "id");

				var slot;

				for (var x in assetObj){

					if(!assetObj.hasOwnProperty(x)) continue;//don't include primitive prototypes

					slot = assetObj[x].slot; //get the id of the slot the asset is assigned

					if(!slotObj[slot].assets) { //if the slotObj of the asset doesn't have an asset parameter, make one
						slotObj[slot].assets = {};
					}
					slotObj[slot].assets[x] = assetObj[x]; //insert assetObj[x] into slotObj[].assets, by its id
				}

				//now get trim info and store it in assets
				$.ajax({
					type: "GET",
					url: "./csv/trims.csv",
					dataType: "text",
					success: function (data) {

						trimObj = csvToObj(data, "id");

						var pId;

						for (var x in trimObj){

							if(!trimObj.hasOwnProperty(x)) continue;//don't include primitive prototypes

							pId = trimObj[x].parentAsset;

							if(!assetObj[pId].trims){
								assetObj[pId].trims = {};
							}
							assetObj[pId].trims[x] = trimObj[x]; //add trims to asset objects

						}
console.log(slotObj);
					},
					error: function(xhr, status, err){  //apparently not thrown on cross domain requests
				            console.log(status + err + ": could not load trim info");
				    }
				});
			},
			error: function(xhr, status, err){  //apparently not thrown on cross domain requests
		            console.log(status + err + ": could not load asset info");
		    }
		});
	},
	error: function(xhr, status, err){  //apparently not thrown on cross domain requests
            console.log(status + err + ": could not load slot info");
	}
});


//creates object from csv text. assigned by specified property
function csvToObj(text, property) {

	var textLines = text.split(/\r\n|\n/);
	
	var headers = textLines[0].split(',');

	var output = {}

	for (var i = 1, len = textLines.length; i < len; i++) {
		
		var lineArr = textLines[i].split(',');

		var obj = {};
		
		for (var j = 0, jlen = headers.length; j < jlen; j++){		

			//we need parse numbers for number strings
			if( isNaN(lineArr[j]) ){
				obj[headers[j]] = lineArr[j];
			}
			else {
				obj[headers[j]] = parseFloat(lineArr[j]);
			}
		}

		//prevent adding empty object
		if( lineArr[j - 1]){ 
			output[obj[property]] = obj;
		}
	}
	return output;
}
