var assetInfo;

$.ajax ({
	type: "GET",
	url: "./csv/asset info 2.csv",
	dataType: "text",
	success: function (data) {

		assetInfo = csvToObj(data);

		var branches = {};

		//creates object for each 'slot' which stores its parent, the assets in the slot, and its children
		for( var i = 0, len = assetInfo.length; i < len; i++){

			if(!branches[assetInfo[i].slot]) {

				branches[assetInfo[i].slot] = {
					children: {},
					parent: assetInfo[i].parent,
					assets: {}				
				};
			}

			branches[assetInfo[i].slot].assets[assetInfo[i].id] = assetInfo[i]; 
		}

		for( var i = 0, len = assetInfo.length; i < len; i++){

			if(assetInfo[i].parent != "root" && assetInfo[i].slot != "trim")
			branches[assetInfo[i].parent].children[assetInfo[i].slot] = branches[assetInfo[i].slot];
		}

		console.log(branches);



	}

});



function csvToObj(text) {

	var textLines = text.split(/\r\n|\n/);
	
	var headers = textLines[0].split(',');

	var arr = [];

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
			arr.push(obj);
		}
	}
	return arr;
}
