

//for OSX: open -a 'Google Chrome.app' --args --disable-web-security --allow-file-access-from-files
//for windows: C:\Program Files (x86)\Google\Chrome\Application\chrome.exe --allow-file-access-from-files --disable-web-security

//GLOBALS
var slotsByName = {},
assetsById = {}, 
trimsById = {},
imageArrayById = [],
groupArray = [],
selOptions = [],
selectedSlot = "",
selectedAsset = "",
selectedTrim = "";

//colorTarget is target of HSL sliders
colorTarget = {
	targetObject: '',
	id: ''
} 


var slotTree = {
	assetEquipped : "None",
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
			slotsByName[key].assetEquipped = "None"; //stores id of asset for this slot, if equipped
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
	
				var slot = slotsByName[trimsById[id].trimPlacement];

				if(!slot.trimsEquipped[parentId]){
					slot.trimsEquipped[parentId] = []; //adds array for each parent with trims, to store its trims (within the object, slot.trimsEquipped)
				} 
				slot.trimsEquipped[parentId][trimsById[id].order] = id;
			}
		}	

	//now that's done, create array for layers to draw

		imageArrayById = createimageArrayById(imageArrayById, slotTree);

		console.log(imageArrayById);

		//build selOptions array
		for(var key in slotsByName){	
		    
			selOptions.push({
				name : slotsByName[key].name,
				value : slotsByName[key].name,					
				class : "slots"		
			});								
		}	

		insertOptions('#slot_selector', selOptions); //insert options into slot_selector element

		selectedSlot = $('#slot_selector').val(); //update selected slot

		createAssetSelector();
		
		colorTarget = { targetObject : assetsById,	id : selectedAsset};

		getImageData(imageArrayById,drawCharacter);	//get imagedata and draw image

	});
	//when slot selector is changed, store the new slot value in selectedSlot and update the Asset Selector
	$('#slot_selector').change(function(){
		createAssetSelector();
		colorTarget = { targetObject : assetsById,	id : selectedAsset};
	});

	$('#asset_selector').change( function(){//when the asset selector is changed
		updateAsset();
		colorTarget = { targetObject : assetsById, id : selectedAsset};
	});

	$('#trim_toggle').on('click', function(){
		trimToggle();
		colorTarget = { targetObject : trimsById, id : selectedTrim};
	});

	$('#trim_selector').change(function(){
		colorTarget = { targetObject : trimsById,	id : selectedTrim};

		selectedTrim = $(this).val();

		if(selectedTrim == "None" || !selectedTrim) { //if nothing selected

			colorTarget = { targetObject : assetsById,	id : selectedAsset}; //target asset

			updateOutput(colorTarget.targetObject[colorTarget.id]);

		} else{
			
			colorTarget = { targetObject : trimsById,	id : selectedTrim};

			updateOutput(colorTarget.targetObject[colorTarget.id]);
		}
	});

	$('#trim_selector').focus(function(){
		colorTarget = { targetObject : trimsById,	id : selectedTrim};
	});

	$('#asset_selector').focus(function(){
		colorTarget = { targetObject : trimsById,	id : selectedTrim};
	});

	$('.hsl_sliders').change(function(){
		changeColor(this);
	});

	$('.hsl_text').change(function(){
		changeColor(this);
	});

	//clickable selectivity
	var canvas = document.getElementById('canvas'),
	    canLeft = canvas.offsetLeft,
	    canTop = canvas.offsetTop;

	canvas.addEventListener('click', function(event){

		clickSelect(canvas,canLeft,canTop);

	});

});


console.log('create trimselect functionality');

/**--------------------------------------------------------------------------FUNCTIONS---------------------------------------------------------------------**/


function changeColor(element){

		var inputName = $(element).attr('name');
		
		colorTarget.targetObject[colorTarget.id][inputName] = $("#" + inputName + $(element).attr('type')).val(); //update values in asset

		updateOutput(colorTarget.targetObject[colorTarget.id]);

		drawCharacter(imageArrayById);
}

function clickSelect(canvas,canLeft,canTop){

	var x = event.pageX - canLeft,
	y = event.pageY - canTop;

	//adjust for responsive height
	x = Math.floor(x * canvas.width / $('#canvas').width());
	y = Math.floor(y * canvas.height / $('#canvas').height());

	for(var l = imageArrayById.length, i = l - 1; i >= 0; i--){ //iterate down array
		
		//check if mouse is in bounds of asset
		if( x >= imageArrayById[i].x &&
			x <= imageArrayById[i].x + imageArrayById[i].w &&
			y >= imageArrayById[i].y &&
			y <= imageArrayById[i].y + imageArrayById[i].h ) { 

			if( imageArrayById[i].img.data[4 *(x - imageArrayById[i].x + imageArrayById[i].w * (y - imageArrayById[i].y)) + 3] ) { //if pixel has alpha 

				if(imageArrayById[i].type == 'trim'){ //if it's a trim

					$('#slot_selector').val(assetsById[imageArrayById[i].parentAsset].slot).change(); //select its parent asset's slot and trigger change event

					$('#trim_selector').val(imageArrayById[i].id).change(); //select the trim and trigger change();
				}
				else if(imageArrayById[i].type == 'asset'){
					
					selectedSlot = imageArrayById[i].slot;					

					$('#slot_selector').val(imageArrayById[i].slot).change(); //select asset's slot and trigger chagne event
				}

				break;
			}
		}				
	}
}

function trimToggle(){

	trimsById[selectedTrim].equipped = !trimsById[selectedTrim].equipped;

	updateTrims(selectedAsset);

	if(trimsById[selectedTrim].equipped){ //if the trim is now equipped, then change button and set colorTarget to trim
		$('#trim_toggle').html('Remove Trim')
		colorTarget = { targetObject : trimsById, id : selectedTrim};
	} else { //otherwise insert blank
		$('#trim_toggle').html('Add Trim')
	}
	
	imageArrayById = [];

	imageArrayById = createimageArrayById(imageArrayById, slotTree);
	
//	console.log(imageArrayById);
	
	getImageData(imageArrayById,drawCharacter);	//get imagedata and draw image
}



function createTrimSelector(){ //creates dropdown for trims, hids if no trime

	if(selectedAsset != 'None' && assetsById[selectedAsset].hasOwnProperty('trims')){
		
		var listarray = [];

		for(key in assetsById[selectedAsset].trims){
			listarray.push({
				name: assetsById[selectedAsset].trims[key].name,
				value: assetsById[selectedAsset].trims[key].id,
				class: "trims"
			})
		}

		insertOptions("#trim_selector", listarray);

		selectedTrim = $('#trim_selector').val();

		if(selectedTrim != 'None'){
			if(trimsById[selectedTrim].equipped){
				$('#trim_toggle').html('Remove Trim')
			} else {
				$('#trim_toggle').html('Add Trim')
			}
		}

		$('#trim_div').show();
	}
	else{
		$('#trim_div').hide();
	}
}

function updateTrims(assetId){ //inserts all equipped trims of an asset, and removes unequipped trims

	if(assetsById[assetId].trims) { //if asset has trims

		for (var trimId in assetsById[assetId].trims){ //iterate for each trim by its ID
			if(trimsById[trimId].equipped){
				if(!slotsByName[trimsById[trimId].trimPlacement].trimsEquipped[assetId]){ //if there isn't an object for the asset's trims in the slot, then make one
					slotsByName[trimsById[trimId].trimPlacement].trimsEquipped[assetId] = [];
				}
				slotsByName[trimsById[trimId].trimPlacement].trimsEquipped[assetId][trimsById[trimId].order] = trimId; //insert the trim in its appropriate place
			}	
			else{
				if(slotsByName[trimsById[trimId].trimPlacement].trimsEquipped[assetId])
					slotsByName[trimsById[trimId].trimPlacement].trimsEquipped[assetId][trimsById[trimId].order] = ""; //insert blank string
			}
		}
	}
}

function clearTrims(assetId){ //removes all trims of an asset from slots

	if(assetsById[assetId].trims) { //if asset has trims
		for (var trimId in assetsById[assetId].trims){ //iterate for each trim by its ID
			if(slotsByName[trimsById[trimId].trimPlacement].trimsEquipped[assetId])
				delete slotsByName[trimsById[trimId].trimPlacement].trimsEquipped[assetId]; //delete all trims for that asset from slot
		}
	}
}

function updateAsset(){ //triggered when asset_selector is changed. swaps out asset to new one

	selectedAsset = $('#asset_selector').val();//get the new asset selected (value is asset's id)

	if(slotsByName[selectedSlot].assetEquipped != 'None') { //if there is currently an equipped asset
		clearTrims(slotsByName[selectedSlot].assetEquipped); //clear currently equipped ass trims
	}

	if(selectedAsset != 'None'){ //if the selected asset isn't None
		
		$('#hsl_sliders').show();
		
		slotsByName[selectedSlot].assetEquipped = selectedAsset; //insert the id string of the new asset
		
		assetsById[selectedAsset].equipped = 1; //update new asset equipped status

		updateTrims(selectedAsset);
	}
	else{
		
		slotsByName[selectedSlot].assetEquipped = 'None'; //insert the id string of the new asset
		
		$('#hsl_sliders').hide();
	}
	
	imageArrayById = []; //clear out draw array
	
	imageArrayById = createimageArrayById(imageArrayById, slotTree); //create a new draw array

	getImageData(imageArrayById,drawCharacter);//getImageData

	createTrimSelector();
}


function createAssetSelector(){ //creates the dropdown for the current asset, updates selectedSlot and selectedAsset, launches createTrimSelector
	
	selectedSlot = $('#slot_selector').val();
	
	selectedAsset = slotsByName[selectedSlot].assetEquipped; //update selected asset, according to slot object	
	
	var array = [];

	array.push({
		name: 'None',
		value: 'None',
		class: 'asset empty'
	});

	if(!$.isEmptyObject(slotsByName[selectedSlot].assets)) { //if there are assets in object, add them to array

		for (var id in slotsByName[selectedSlot].assets){
			array.push({
				name: slotsByName[selectedSlot].assets[id].name,
				value: id,
				class: 'asset'
			});
		}
	}
	
	insertOptions('#asset_selector', array); //insert options into asset_selector selector element

	$('#asset_selector').val(selectedAsset); //select the asset which is equipped

	if(selectedAsset != 'None') {

		updateOutput(assetsById[slotsByName[selectedSlot].assetEquipped]); //pass the asset object into updateOutput

		$('#hsl_sliders').show();
	}	
	else {

		$('#hsl_sliders').hide();
	}

	createTrimSelector();
}


function insertOptions(elementId, arr){ //insert options into element specified by id

	var s = "";

	for(var i = 0, l = arr.length; i < l; i++){
		s += "<option value=\"" + arr[i].value + "\"";
		if(arr[i].class){
			s += "class=\"" + arr[i].class + "\"";}
		s += ">" + arr[i].name + "</option>";
	}

	$(elementId).html(s);
}

function createimageArrayById(array, slotsByName){//recursively iterates through childrenBelow, assetEquipped, trimsEquipped, childrenAbove

	for(var i = 0, i_len = slotsByName.childrenBelow.length; i < i_len; i++){ //first iterate along imageArrayById's childrenBelow
		createimageArrayById(array, slotsByName.childrenBelow[i]);
	}

	//add assets
	if(slotsByName.assetEquipped != 'None') {
		array.push(assetsById[slotsByName.assetEquipped]);
	}
	//add trim objects to array
	if(slotsByName.trimsEquipped){ 

		for(var key in slotsByName.trimsEquipped){ //iterate through each group of trims equipped

			for(var i = 0, i_len = slotsByName.trimsEquipped[key].length; i < i_len; i++){ //iterate through each trim in each group
				if(trimsById[slotsByName.trimsEquipped[key][i]]) {
					array.push(trimsById[slotsByName.trimsEquipped[key][i]]);
				}
			}
		}
	}

	for (var i = 0, i_len = slotsByName.childrenAbove.length; i < i_len; i++) {
		createimageArrayById(array, slotsByName.childrenAbove[i]);
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

		$('#huerange').val( obj.hue );
		$('#huetext').val( obj.hue );
		$('#satrange').val( obj.sat );
		$('#sattext').val( obj.sat );
		$('#lumrange').val( obj.lum );
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