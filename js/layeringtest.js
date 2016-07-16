//for OSX: open -a 'Google Chrome.app' --args --disable-web-security --allow-file-access-from-files
//for windows: C:\Program Files (x86)\Google\Chrome\Application\chrome.exe --allow-file-access-from-files --disable-web-security
 
 var slotObj = {}, slotTree = {}, assetObj = {}, trimObj = {};

$.ajax ({
	type: "GET",
	url: "./csv/slots.csv",
	dataType: "text",

	success: function (data) { //create an object treee of the slots of the character from slots.csv

		slotObj = csvToObj(data, 'slot');

		for( var key in slotObj) {

			slotObj[key].assetEquipped = "";
			slotObj[key].trimsEquipped = [];

			var keyParent = slotObj[key].parent;

			if(!slotObj.hasOwnProperty(key)) continue; //don't include primitive prototypes

			//add root slots to tree
			if( keyParent == "root"){
				slotTree[key] = slotObj[key]; //insert object for slot key into property key of slotTree
			}
			else {
				if(slotObj[key].order < 0){ //if the order of the object of key is <1, then it goes in children.Below of its parent slot
					if(!slotObj[keyParent].childrenBelow){ //if key's parent doesn't have childrenBelow, create childrenBelow array
						slotObj[keyParent].childrenBelow = [];
					}
					slotObj[keyParent].childrenBelow[Math.abs(slotObj[key].order)] = slotObj[key]; //link key to childrenBelow array according to its order property
				}
				else {
					if(!slotObj[keyParent].childrenAbove){ //if key's parent doesn't have childrenAbove create childrenAbove array
						slotObj[keyParent].childrenAbove = [];
					}
					slotObj[keyParent].childrenAbove[slotObj[key].order] = slotObj[key]; //link key to childrenAbove array according to its order property
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

				for (var key in assetObj){

					if(!assetObj.hasOwnProperty(key)) continue;//don't include primitive prototypes

					slot = assetObj[key].slot; //get the id of the slot the asset is assigned

					if(!slotObj[slot].assets) { //if the slotObj of the asset doesn't have an asset parameter, make one
						slotObj[slot].assets = {};
					}
					slotObj[slot].assets[key] = assetObj[key]; //insert assetObj[key] into slotObj[].assets, by its id
				}

				//now get trim info and store it in assets
				$.ajax({
					type: "GET",
					url: "./csv/trims.csv",
					dataType: "text",
					success: function (data) {

						trimObj = csvToObj(data, "id");

						var pId;

						for (var key in trimObj){

							if(!trimObj.hasOwnProperty(key)) continue;//don't include primitive prototypes

							pId = trimObj[key].parentAsset;

							if(!assetObj[pId].trims){
								assetObj[pId].trims = {};
							}
							assetObj[pId].trims[key] = trimObj[key]; //add trims to asset objects

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
