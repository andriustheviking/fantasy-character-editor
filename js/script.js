//for OSX: open -a 'Google Chrome.app' --args --disable-web-security --allow-file-access-from-files
//for windows: C:\Program Files (x86)\Google\Chrome\Application\chrome.exe --allow-file-access-from-files --disable-web-security
$(document).ready( function(){

	var assetArray = [];

	var n;

	var groupArray = []; // array 

	var selOptions = []; //array to store selector options

	var arrayRef;

	$.ajax ({
		type: "GET",
		url: "./csv/humanmale_pose_01.csv",
		dataType: "text",
		success: function(data) { 

			assetArray = csvToObj(data);

			for(var x in assetArray){	
				var obj = {};		
				obj.name = assetArray[x].name; 
				obj.value = x;
				obj.class = "bodyasset";
				selOptions.push(obj);								
			}//pushes object onto selOptions array

			insertOptions('#selector', selOptions);

			n = parseInt($('#selector').val());		

			getImageData(assetArray,drawCharacter);
		
			updateOutput(assetArray,n);

			console.log(assetArray);			

			$.ajax({
				type: "GET",
				url: "./csv/groups.csv",
				dataType: "text",
				success: function(data) {

					groupArray = parseGroups(data);

					for(var x in groupArray){	
						var obj = {};		
						obj.name = x; 
						obj.value = x;					//TEMPORARY STORING CLASS VALUE
						obj.class = "bodygroup";          
						selOptions.push(obj);								
					}	

					insertOptions('#selector', selOptions);

					console.log(groupArray);
				}
			});		
		}
	});

	//if selector is changed, update sliders and text
	$("#selector").change(function(){

		if( $("#selector option:selected").hasClass("bodygroup")) {
			
			arrayRef = groupArray;

			$("#applygroup").show(); //show apply button
	
		}
		else if( $("#selector option:selected").hasClass('bodyasset')) {

			arrayRef = assetArray;

			$("#applygroup").hide(); //hide apply button

		}

		n = $('#selector').val();	

		updateOutput(arrayRef,n);

	});

	//when apply button is pressed, apply skin group to assets then hide button
	$('#applygroup').click( function(){

		if( $("#selector option:selected").hasClass("bodygroup")) {
			arrayRef = groupArray;
			n = $("#selector option:selected").val();
		}

		applyGroupHsl(arrayRef, assetArray,n);

		drawCharacter(assetArray)

		$("#applygroup").hide(); //hide apply button

	});

	//if slider is changed update values
	$('input[type=range]').change(function(){

		n = $('#selector').val();	

		//update values in user array
		arrayRef[n].hue = $("#hueslide").val();
		arrayRef[n].sat = $("#satslide").val();
		arrayRef[n].lum = $("#lumslide").val();

		updateOutput(arrayRef,n);

		if( arrayRef == assetArray){
			drawCharacter(assetArray); //draw character using user array
		}
		else if (arrayRef == groupArray && $('#applygroup').css('display') == 'none'){
			console.log('here');
			applyGroupHsl(arrayRef, assetArray,n);
			drawCharacter(assetArray); //draw character using user array
		}


	});   

	//manual hsl input update array hsl values and redraw
	$('input[type=text]').change(function(){

		n = $('#selector').val();

		//update values in user array
		arrayRef[n].hue = $("#huetext").val();
		arrayRef[n].sat = $("#sattext").val();
		arrayRef[n].lum = $("#lumtext").val();

		updateOutput(arrayRef,n);

		if( arrayRef == assetArray){
			drawCharacter(assetArray); //draw character using user array
		}
		else if (arrayRef == groupArray && $('#applygroup').css('display') == 'none'){
			console.log('here');
			applyGroupHsl(arrayRef, assetArray,n);
			drawCharacter(assetArray); //draw character using user array
		}

	});    

	//clickable selectivity
		var canvas = document.getElementById('canvas'),
		    canLeft = canvas.offsetLeft,
		    canTop = canvas.offsetTop;

		    canvas.addEventListener('click', function(event){

		    	var x = event.pageX - canLeft,
		    	y = event.pageY - canTop;

		    	//adjust for responsive height
		    	x = Math.floor(x * canvas.width / $('#canvas').width());
		    	y = Math.floor(y * canvas.height / $('#canvas').height());

			for(var l = assetArray.length, i = l - 1; i >= 0; i--){ //iterate down array

				if( x >= assetArray[i].x &&
					x <= assetArray[i].x + assetArray[i].w &&
					y >= assetArray[i].y &&
					y <= assetArray[i].y + assetArray[i].h ) { //check if mouse is in bounds of asset

					if( assetArray[i].img.data[4 *(x - assetArray[i].x + assetArray[i].w * (y - assetArray[i].y)) + 3] ) { //if pixel alpha 

						$('#selector').val(i);

						arrayRef = assetArray;

						updateOutput(assetArray, i);
						break;
					}
				}				
			}


		});

});

function applyGroupHsl (reference, assets, n){ //applies index n of reference array hsl to asset array

	for(var x in assets){

		if( reference[n].list.indexOf(assets[x].slot) != -1){ //if the slot name exists in group list, then change values
			
			assets[x].hue = reference[n].hue;
			assets[x].sat = reference[n].sat;
			assets[x].lum = reference[n].lum;
		}
	}
}

function insertOptions(idString, arr){ //insert options into element specified by id

	var s = "";

	for(var i in arr){
		s += "<option value=\"" + arr[i].value + "\"";
		if(arr[i].class){
			s += "class=\"" + arr[i].class + "\"";}
		s += ">" + arr[i].name + "</option>";
	}

	$(idString).html(s);
}

function parseGroups (text){ //returns an array of objects {groupName,h,s,l,list}

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

function csvToObj(text) {

	var textLines = text.split(/\r\n|\n/);
	
	var headers = textLines[0].split(',');

	var arr = [];

	for (var i = 1, len = textLines.length; i < len; i++) {
		
		var lineArr = textLines[i].split(',');

		var obj = {};
		
		for (var j = 0, jlen = headers.length; j < jlen; j++){		

			//we need parse numbers for only number strings
			if( isNaN(lineArr[j]) ){
				obj[headers[j]] = lineArr[j];
			}
			else {
				obj[headers[j]] = parseFloat(lineArr[j]);
			}
		}

		//prevent adding empty object
		if( lineArr[j - 1]){ 
			arr[obj.drawOrder] = obj;
		}
	}
	return arr;
}


function updateOutput(a,n){

		$('#hueslide').val( a[n].hue );
		$('#huetext').val( a[n].hue );
		$('#satslide').val( a[n].sat );
		$('#sattext').val( a[n].sat );
		$('#lumslide').val( a[n].lum );
		$('#lumtext').val( a[n].lum );
}


function getImageData (arr, callback){

	var img = []; //array to store image elements

	var canvas = document.getElementById('canvas');
	canvas.width = 835;
	canvas.height = 900;

	var ctx = canvas.getContext('2d');

	//need counter due to asynch loading
	var counter = 0;

	//iterate though dropbox links and fill arr with image data using canvas
	for (var i = 0, l = arr.length; i < l; i++) {

	//anonymous function to fix sync issue
		(function(j,l){

			//create image element
			img[j] = new Image();

			img[j].src = arr[j].location;

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