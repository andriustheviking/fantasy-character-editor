

//for OSX: open -a 'Google Chrome.app' --args --disable-web-security --allow-file-access-from-files
//for windows: C:\Program Files (x86)\Google\Chrome\Application\chrome.exe --allow-file-access-from-files --disable-web-security

//GLOBALS
var slotsByName = {},
assetsById = {}, 
trimsById = {},
drawArrayById = [],
groupArray = [],
selOptions = [],
selectedSlot = "",
selectedAsset = ""; 


var slotTree = {
	assetEquipped : "",
	assets : {},
	childrenAbove : [],
	childrenBelow : [],
	trimsEquipped : {},
};


$(document).ready( function(){

	$.when(

		$.ajax ({
			type: "GET",
			url: "./csv/slots.csv",
			dataType: "text",

			success: function (data) { //create an object treee of the slots of the character from slots.csv

				slotsByName = csvToObj(data, 'name');
			},
			error: function(xhr, status, err){  //apparently not thrown on cross domain requests
		            console.log(status + err + ": could not load slot info");
			}
		}),

		$.ajax({
			type: "GET",
			url: "./csv/asset info.csv",
			dataType: "text",
			success: function (data) {

				assetsById = csvToObj(data, "id");
			},
			error: function(xhr, status, err){  //apparently not thrown on cross domain requests
		            console.log(status + err + ": could not load asset info");
		    }
		}),

		$.ajax({
			type: "GET",
			url: "./csv/trims.csv",
			dataType: "text",
			success: function (data) {

				trimsById = csvToObj(data, "id");
			},
			error: function(xhr, status, err){  //apparently not thrown on cross domain requests
		            console.log(status + err + ": could not load trim info");
		    }
		}),

		$.ajax({
			type: "GET",
			url: "./csv/groups.csv",
			dataType: "text",
			success: function(data) {

				groupArray = parseSlotGroups(data);
			},
			error: function(xhr, status, err){  //apparently not thrown on cross domain requests
			    console.log(status + err + ": could not load group info");
			}
		})
	).done( function(){

		//fill out rest of slot object
		for( var key in slotsByName) { //add empty properties to each slotsByName[key]
			slotsByName[key].assetEquipped = ""; //stores id of asset for this slot, if equipped
			slotsByName[key].assets = {}; // stores (points to) objects for each asset for slot
			slotsByName[key].childrenAbove = []; // array of children slots above this slot
			slotsByName[key].childrenBelow = []; // array of children slots below this slot
			slotsByName[key].trimsEquipped = {}; //array of trims applied to this slot
		}

	// link slot parents / children
		for( var key in slotsByName) {

			var objParent = slotsByName[key].parent;

			if(!slotsByName.hasOwnProperty(key)) continue; //don't include primitive prototypes

			//add root slots to tree
			if( objParent == "root"){
				slotTree.childrenAbove[slotsByName[key].order] = slotsByName[key]; //insert object for key into property of slotTree
			}
			else {
				if(slotsByName[key].order < 0){ //if the order of the object of key is <1, then it goes in children.Below of its parent slot
					slotsByName[objParent].childrenBelow[Math.abs(slotsByName[key].order) - 1] = slotsByName[key]; // (abs - 1, since index must start at 0, and be positive)
				}
				else {
					slotsByName[objParent].childrenAbove[slotsByName[key].order] = slotsByName[key]; //link key to childrenAbove array according to its order property
				}
			}
		}

	// link assets to slots
		var slot;

		for (var id in assetsById){

			if(!assetsById.hasOwnProperty(id)) continue;//don't include primitive prototypes

			slot = assetsById[id].slot; //get the id of the slot the asset is assigned

			if(!slotsByName[slot].assets) { //if the slotsByName of the asset doesn't have an asset parameter, make one
				slotsByName[slot].assets = {};
			}

			slotsByName[slot].assets[id] = assetsById[id]; //insert assetsById[key] into slotsByName[slot].assets, by its id

			if (assetsById[id].equipped){	//if the asset is equipped, then insert its id name into assetEquipped
				slotsByName[slot].assetEquipped = id;
			}
		}

	// get trim info and store it in assets
		var parentId;

		for (var id in trimsById){

			if(!trimsById.hasOwnProperty(id)) continue;//don't include primitive prototypes

			parentId = trimsById[id].parentAsset;

			if(!assetsById[parentId].trims)
				assetsById[parentId].trims = {}; //create trim object for assets with trims
			
			assetsById[parentId].trims[id] = trimsById[id]; //add trims to asset objects

			if (assetsById[parentId].equipped){ //add the trims to their place
	//console.log(assetsById[parentId]);
				var slot = slotsByName[trimsById[id].trimPlacement];

				if(!slot.trimsEquipped[parentId]){
					slot.trimsEquipped[parentId] = []; //adds array for each parent with trims, to store its trims (within the object, slot.trimsEquipped)
				} 
				slot.trimsEquipped[parentId][trimsById[id].order] = id;
			}
		}	

	//now that's done, create array for layers to draw

		drawArrayById = createDrawArrayById(drawArrayById, slotTree);

		//build selOptions array
		for(var key in slotsByName){	
			
			var obj = {};

			obj.name = slotsByName[key].name;
			obj.value = slotsByName[key].name;					
			obj.class = "slots";    
    
			selOptions.push(obj);								
		}	

		insertOptions('#slot_selector', selOptions);

		selectedSlot = $('#slot_selector').val();

		getImageData(drawArrayById,drawCharacter);

	});
});

//NOW IMPLIMENT FUNCTIONALITY

//when slot selector is changed, store the new slot value in selectedSlot and update the Asset Selector
$('#slot_selector').change(function(){
	selectedSlot = $('#slot_selector').val();
	updateAssetSelector(selectedSlot);
});

//when the asset selector is changed
$('#asset_selector').change( function(){
	
	selectedAsset = $('#asset_selector').val();
	//change equipped status to 0
	assetsById[slotsByName[selectedSlot].assetEquipped].equipped = 0; 
	//insert the id string of the new asset
	slotsByName[selectedSlot].assetEquipped = selectedAsset; 
	//update new asset equipped status
	assetsById[selectedAsset].equipped = 1; 
	//clear out draw array
	drawArrayById = [];
	//create a new draw array
	drawArrayById = createDrawArrayById(drawArrayById, slotTree); 

	getImageData(drawArrayById,drawCharacter);//getImageData
	
});

/**--------------------------------------------------------------------------FUNCTIONS---------------------------------------------------------------------**/


function updateAssetSelector(slotKey){

	var array = [];

	if(slotsByName[slotKey].assets.length > 0) {

		for (var id in slotsByName[slotKey].assets){
			var obj = {};
			obj.name = slotsByName[slotKey].assets[id].name;
			obj.value = id;
			obj.class = "asset";
			array.push(obj);
		}
		insertOptions('#asset_selector', array);
		selectedAsset = slotsByName[slotKey].assetEquipped;
		$('#asset_selector').val(selectedAsset); //select the asset which is equipped
		updateOutput(assetsById[slotsByName[slotKey].assetEquipped]); //pass the asset object into updateOutput
	}
}

function insertOptions(idString, arr){ //insert options into element specified by id

	var s = "";

	for(var i = 0, l = arr.length; i < l; i++){
		s += "<option value=\"" + arr[i].value + "\"";
		if(arr[i].class){
			s += "class=\"" + arr[i].class + "\"";}
		s += ">" + arr[i].name + "</option>";
	}

	$(idString).html(s);
}

function createDrawArrayById(array, slotsByName){//recursively iterates through childrenBelow, assetEquipped, trimsEquipped, childrenAbove

	for(var i = 0, i_len = slotsByName.childrenBelow.length; i < i_len; i++){ //first iterate along drawArrayById's childrenBelow
		createDrawArrayById(array, slotsByName.childrenBelow[i]);
	}

	//add assets
	if(slotsByName.assetEquipped) {
		array.push(assetsById[slotsByName.assetEquipped]); 
	}
	//add trim objects to array
	if(slotsByName.trimsEquipped){ 

		for(var key in slotsByName.trimsEquipped){ //iterate through each group of trims equipped

			for(var i = 0, i_len = slotsByName.trimsEquipped[key].length; i < i_len; i++){ //iterate through each trim in each group

				array.push(trimsById[slotsByName.trimsEquipped[key][i]]);

			}
		}
	}

	for (var i = 0, i_len = slotsByName.childrenAbove.length; i < i_len; i++) {
		createDrawArrayById(array, slotsByName.childrenAbove[i]);
	}

//console.log(array);
	return array;

}

function applyGroupHsl (reference, assets, n){ //applies index n of reference array hsl to asset array

	for(var x in assets){

		if( reference[n].list.indexOf(assets[x].category) != -1){ //if the slot name exists in group list, then change values
			
			assets[x].hue = reference[n].hue;
			assets[x].sat = reference[n].sat;
			assets[x].lum = reference[n].lum;
		}
	}
}

function parseSlotGroups (text){ //returns an array of objects {groupName,h,s,l,list}

	//split up csv lines into array
	var textLines = text.split(/\r\n|\n/);

	var arr = [];

	for (var i = 0, l = textLines.length; i < l; i++) {

		//split up textline array into array of csv values
		var a = textLines[i].split(',');


		if(a[0]) { //the if a[0] prevents adding empty slots

			arr[a[0]] = {};
			//store the class header as object inside object
			arr[a[0]].hue = a[1];
			arr[a[0]].sat = a[2];
			arr[a[0]].lum = a[3];

			arr[a[0]].list = [];

			//push the class items into object array
			for(var j = 4, ll = a.length; j < ll; j++) {
				
				arr[a[0]].list.push(a[j]);
			}
		}
	}
	return arr;
}

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


function updateOutput(obj){

		$('#hueslide').val( obj.hue );
		$('#huetext').val( obj.hue );
		$('#satslide').val( obj.sat );
		$('#sattext').val( obj.sat );
		$('#lumslide').val( obj.lum );
		$('#lumtext').val( obj.lum );
}


function getImageData (arr, callback){

	var img = []; //array to store image elements

	var canvas = document.getElementById('canvas');
	canvas.width = 835;
	canvas.height = 900;

	var ctx = canvas.getContext('2d');

	//need counter due to asynch loading
	var counter = 0;

	//iterate though array
	for (var i = 0, l = arr.length; i < l; i++) {

	//anonymous function to fix sync issue
		(function(j,l){

			if(!arr[j].img) { //if the array doesn't have image data, then get image data, else add to counter
console.log("drew to canvas");
				//create image element
				img[j] = new Image();

				img[j].src = arr[j].location + '/' + arr[j].filename;

				img[j].onload = function() {

					ctx.drawImage(img[j], 0, 0);

					//store data array in array element
					arr[j].img = ctx.getImageData(0,0, arr[j].w, arr[j].h);

					//clear canvas
					ctx.clearRect( 0, 0, arr[j].w, arr[j].h);

					counter++;
				
					//after images load, run callback function
					if(counter == l){
						callback(arr);
					}
				};
			}
			else{

				counter++;
			
				if(counter == l){ //after images load, run callback function
					callback(arr);
				}			
			}
		})(i,l);
	}
}

function drawCharacter(a){

	var canvas = document.getElementById('canvas');

	var ctx = canvas.getContext('2d');

	ctx.clearRect(0,0, canvas.width, canvas.height);

	var imgData = ctx.getImageData(0,0, canvas.width, canvas.height);

	var data = imgData.data;

	var	c_w = canvas.width;

	//for each layer in array
	for (var n = 0, layers = a.length; n < layers; n++) {

		var y = parseInt(a[n].y),  
			x = parseInt(a[n].x),  
			w = a[n].w, 
			h = a[n].h;

		//iterate for each row of pixels for the height of asset
		for(var i = 0; i < h; i++) {

			//iterate across width of asset (w)
			for (var j = 0; j < w; j++) {
				
				//determine the pixel position for asset p_a multiplied by 4 bytes per pixel (aka rgba)
				var	p_a = 4 * (w * i + j);

				
				//if asset pixel (j) has alpha > 0, then we need to add it to canvas
				if ( a[n].img.data[p_a + 3] > 0){

					//break up rgb to hsl, so we can manipulate color
					var hsl = rgbToHsl( a[n].img.data[p_a + 0], a[n].img.data[p_a + 1], a[n].img.data[p_a + 2]);

					//add in hue and sat values stored in array, adjust lum value using lumChange
					hsl.h = a[n].hue / 360;
					hsl.s = a[n].sat / 100;
					hsl.l = lumChange(hsl.l, a[n].lum / 50);

					//get new rgb value
					var newRgb = hslToRgb(hsl.h, hsl.s, hsl.l);
				
					//determine the pixel position for canvas p_c multiplied by 4 bytes per pixel (aka rgba)
					var p_c = 4 * (x + c_w * (i + y) + j); 

					//if asset pixel is opaque, we simply replace canvas pixel value with new values
					if ( a[n].img.data[p_a + 3] == 255){

						data[p_c + 0] = newRgb.r; //red
						data[p_c + 1] = newRgb.g; //green
						data[p_c + 2] = newRgb.b; //blue
						data[p_c + 3] = 255; // alpha
					}
					//else, we need to combine canvas pixel with asset pixel using linear blend: equation from http://stackoverflow.com/questions/7438263/alpha-compositing-algorithm-blend-modes
					else {
						var d_a = data[p_c + 3] / 255, 
						a_a = a[n].img.data[p_a + 3] / 255,
						final_a = a_a + d_a - a_a * d_a; 

						//linear blend
						data[p_c + 0] = (newRgb.r * a_a + data[p_c + 0] * d_a * (1 - a_a)) / (final_a);
						data[p_c + 1] = (newRgb.g * a_a + data[p_c + 1] * d_a * (1 - a_a)) / (final_a);
						data[p_c + 2] = (newRgb.b * a_a + data[p_c + 2] * d_a * (1 - a_a)) / (final_a);

						data[p_c + 3] = final_a * 255; // alpha

					}
				}
			}
		}
	}
	//paint new image onto canvas
	ctx.putImageData(imgData, 0,0);
}

//returns a pixel's lum value (p) based off the luminosity shift (l)
function lumChange (p, l){

	//the following balances contrast (multiplication) and brightness (addition)
	if (l < 1) {
		if(p < .50)
			p = (p * l);
		else if(p < .6)
			p = ((p * l) + (p + l/2 - .5))/2;
		else if(p < .7)
			p = (2*(p * l) + 3*(p + l/2 - .5))/5;
		else if(p < .8)
			p = (1*(p * l) + 2*(p + l/2 - .5))/3;
		else if(p < .9)
			p = (1*(p * l) + 3*(p + l/2 - .5))/4;
		else
			p = (1*(p * l) + 6*(p + l/2 - .5))/7;
	}
	else {
		if(p < .10)
			p = (6*(p * l) + (p = p + (1 - p) * (l - 1)))/7;
		else if(p < .20)
			p = (3*(p * l) + (p = p + (1 - p) * (l - 1)))/4;
		else if(p < .30)
			p = (2*(p * l) + 1*(p = p + (1 - p) * (l - 1)))/3;
		else if(p < .40)
			p = (3*(p * l) + 2*(p = p + (1 - p) * (l - 1)))/5;
		else if(p < .50)
			p = ((p * l) + (p = p + (1 - p) * (l - 1)))/2;
		else
			p = p + (1 - p) * (l - 1);
	}

	return p;
}

// from http://stackoverflow.com/questions/2353211/hsl-to-rgb-color-conversion
function hslToRgb(h, s, l) {

    if(s == 0){
        r = g = b = l; // achromatic
    }else{
        var hue2rgb = function hue2rgb(p, q, t){
            if(t < 0) t += 1;
            if(t > 1) t -= 1;
            if(t < 1/6) return p + (q - p) * 6 * t;
            if(t < 1/2) return q;
            if(t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        }

        var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        var p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }

    return ({
        r: Math.round(r * 255),
        g: Math.round(g * 255),
        b: Math.round(b * 255),
    });

	console.log("R: " + r + " G: " + g + " B: " + b);
}


function rgbToHsl(r, g, b){
    r /= 255, g /= 255, b /= 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    var h, s, l = (max + min) / 2;

    if(max == min){
        h = s = 0; // achromatic
    }else{
        var d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch(max){
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }

    return ({
    	h: h,
    	s: s,
    	l: l,
    });

}