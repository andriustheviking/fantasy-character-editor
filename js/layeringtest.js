//for OSX: open -a 'Google Chrome.app' --args --disable-web-security --allow-file-access-from-files
//for windows: C:\Program Files (x86)\Google\Chrome\Application\chrome.exe --allow-file-access-from-files --disable-web-security
 
 var slotTree = {};

$.ajax ({
	type: "GET",
	url: "./csv/slots.csv",
	dataType: "text",
	success: function (data) {

		var slotObj = csvToObj(data, 'slot');

		for( var x in slotObj) {

			var xParent = slotObj[x].parent;

			//add root slots to tree
			if( xParent == "root"){
				slotTree[x] = slotObj[x];
			}
			else {
				if(slotObj[x].order < 0){
					if(!slotObj[xParent].childrenBelow){ //if x's parent doesn't have childrenBelow, create childrenBelow array
						slotObj[xParent].childrenBelow = [];
					}
					slotObj[xParent].childrenBelow[Math.abs(slotObj[x].order)] = slotObj[x]; //link x to childrenBelow array ordered by its
				}
				else {
					if(!slotObj[xParent].childrenAbove){ //if x's parent doesn't have childrenBelow, create childrenBelow array
						slotObj[xParent].childrenAbove = [];
					}
					slotObj[xParent].childrenAbove[slotObj[x].order] = slotObj[x]; //link x to childrenBelow array ordered by its
				}
			}
		}

console.log(slotObj);
console.log(slotTree);
console.log("next insert asset csv info to slotObj");
		

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
