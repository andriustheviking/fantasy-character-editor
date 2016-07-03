//for OSX: open -a 'Google Chrome.app' --args --disable-web-security --allow-file-access-from-files
//for windows: C:\Program Files (x86)\Google\Chrome\Application\chrome.exe --allow-file-access-from-files --disable-web-security
 
$.ajax ({
	type: "GET",
	url: "./csv/slots.csv",
	dataType: "text",
	success: function (data) {

		var slotObj = csvToObj(data, 'slot');

		console.log (slotObj);

		for( var x in slotObj) {

			if( x.parent != "root"){
				slotObj[x.parent].prototype.children.push(x);
			}
		}
		console.log (slotObj);
		for( var x in slotObj) {
			// if the slot's parent isn't root, and the slot is mot a trim
			if (slotObj[x].parent != "root" && slotObj[x].slot != "trim"){
				
				// add the branch of the slot to its parent's children object
				branches[slotObj[x].parent].children[slotObj[x].slot] = branches[slotObj[x].slot];
			}
			else if (slotObj[x].slot == "trim") {

			}
		}

		var tree = {};

		for (x in branches) {

			if(branches[x].parent == "root"){
				tree[x] = branches[x]; //adds only root branches to tree.root
			}
		}

		console.log(tree);

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
