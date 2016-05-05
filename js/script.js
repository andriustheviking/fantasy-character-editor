//for OSX: open -a 'Google Chrome.app' --args --disable-web-security --allow-file-access-from-files
//for windows: C:\Program Files (x86)\Google\Chrome\Application>chrome.exe --allow-file-access-from-files --disable-web-security
$(document).ready( function(){

	var arr = [];

	$.ajax ({
		type: "GET",
		url: "./csv/pose_01.csv",
		dataType: "text",
		success: function(data) { 

			arr = csvToObj(data);

			var s = "";

			for(var i = 0; i < arr.length; i++){			
				s += "<option value=\" " + i +" \">" + arr[i].name + "</option>"; 				
			}	

			$('#selector').html(s);
		
			getImageData(arr);
		
			updateOutput(arr);			

			drawCharacter(arr);


		}
	});

	//if selector is changed, update sliders and text
	$("#selector").change(function(){
		updateOutput(arr);
	});

});


function csvToObj(text) {

	var textLines = text.split(/\r\n|\n/);
	
	var headers = textLines[0].split(',');

	var arr = [];

	for (var i = 1; i < textLines.length; i++) {
		
		var lineArr = textLines[i].split(',');

		var obj = {};
		
		for (var j = 0; j < headers.length; j++){		
			obj[headers[j]] = lineArr[j];
		}

		//prevent adding empty object
		if( lineArr[j - 1]){ 
			arr[obj.drawOrder] = obj;
		}
	}

	return arr;

}


function updateOutput(a,n){

		var n = $('#selector').val();

		n = parseInt(n);

		$('#hueslide').val( a[n].hue );
		$('#huetext').val( a[n].hue );
		$('#satslide').val( a[n].sat );
		$('#sattext').val( a[n].sat );
		$('#lumslide').val( a[n].lum );
		$('#lumtext').val( a[n].lum );

}


function getImageData (arr){

	var img = []; //array to store image elements

	var canvas = document.getElementById('canvas');
	canvas.width = 835;
	canvas.height = 900;

	var ctx = canvas.getContext('2d');

	//iterate though dropbox links and fill arr with image data using canvas
	for (var i = 0, l = arr.length; i < l; i++) {

	//anonymous function to fix sync issue
		(function(j){

			//create image element
			img[j] = new Image();

			img[j].src = arr[j].location;

			img[j].onload = function() {

				ctx.drawImage(img[j], 0, 0);

				//store data array in array element
				arr[j].img = ctx.getImageData(0,0, arr[j].w, arr[j].h);

				//clear canvas
				ctx.clearRect( 0, 0, arr[j].w, arr[j].h);

			};
		})(i);
	}
}

function drawCharacter(a){

	var canvas = document.getElementById('canvas');

	var ctx = canvas.getContext('2d');

	ctx.clearRect(0,0, canvas.width, canvas.height);

	var imgData = ctx.getImageData(0,0, canvas.width, canvas.height);

	var data = imgData.data;

	var	c_w = canvas.width;

	console.log(a);

	//for each layer in array
	for (var n = 0, layers = a.length; n < layers; n++) {

		var y = a[n].y,  
			x = a[n].x,  
			w = a[n].w, 
			h = a[n].h;

		//iterate down for each row of pixels, starting at pixel position y, ending at y + h
		for(var i = y; i < y + h; i++) {

//NEED TO FIX HERE - CHANGE j start at 0 and end at w * 4, fix the rest accordingly

			//iterate starting at pixel number x + y * canv width, all multiplied by 4 (32 bits per pixel)
			for (var j = 4 * (x + c_w*y), end = 4 * (w + x + c_w * y);  j < end; j += 4) {

				//if new pixel is opaque, we replace old pixel data with new
				if ( a[n].img.data[j + 3] == 255){

					//break up rgb to hsl, so we can manipulate color
					var hsl = rgbToHsl( a[n].img.data[j + 0], a[n].img.data[j + 1], a[n].img.data[j + 2]);

					//add in hue and sat values stored in array
					hsl.h = a[n].hue / 360;
					hsl.s = a[n].sat / 100;
					hsl.l = lumChange(hsl.l, a[n].lum / 50);

					//get new rgb value
					var newRgb = hslToRgb(hsl.h, hsl.s, hsl.l);

					data[j + 0] = newRgb.r; //red
					data[j + 1] = newRgb.g; //green
					data[j + 2] = newRgb.b; //blue
					data[j + 3] = 255; // alpha
				}
				//else if pixel alpha is slightly transparent. equation from http://stackoverflow.com/questions/7438263/alpha-compositing-algorithm-blend-modes
				else if( a[n].img.data[j + 3] > 0) {

					//break up rgb to hsl, so we can manipulate color
					var hsl = rgbToHsl( a[n].img.data[j + 0], a[n].img.data[j + 1], a[n].img.data[j + 2]);

					//add in h and s from values stored in array
					hsl.h = a[n].hue / 360;
					hsl.s = a[n].sat / 100;
					hsl.l = lumChange(hsl.l, a[n].lum / 50);

					//get new rgb value
					var newRgb = hslToRgb(hsl.h, hsl.s, hsl.l);

					var d_a = data[j + 3] / 255, 
					a_a = a[n].img.data[j + 3] / 255,
					final_a = a_a + d_a - a_a * d_a; 

					//linear blend
					data[j + 0] = (newRgb.r * a_a + data[j + 0] * d_a * (1 - a_a)) / (final_a);
					data[j + 1] = (newRgb.g * a_a + data[j + 1] * d_a * (1 - a_a)) / (final_a);
					data[j + 2] = (newRgb.b * a_a + data[j + 2] * d_a * (1 - a_a)) / (final_a);

					data[j + 3] = final_a * 255; // alpha

				}

			}
		}

	}

	//paint new image onto canvas
	ctx.putImageData(imgData, 0,0);
}

function storeAssets(a){

	var canvas = document.getElementById('canvas');

	var ctx = canvas.getContext('2d');

	ctx.clearRect(0,0, canvas.width, canvas.height);

	// multiply number of pixels in canvas by 4 (rgba)
	var len = 4 * (canvas.width * canvas.height);

	console.log(len);

	var imgData = ctx.getImageData(0,0, canvas.width, canvas.height);

	var data = imgData.data;

	//iterate for each pixel in canvas
	for (var j = 0; j < 6; j++) {

		//iterate through each array for that pixel
		for (var i = 0; i < len; i += 4) {

			//if pixel is opaque, just overright data
			if ( a[j].img.data[i + 3] == 255){

				//break up rgb to hsl, so we can manipulate color
				var hsl = rgbToHsl( a[j].img.data[i + 0], a[j].img.data[i + 1], a[j].img.data[i + 2]);

				//add in h and s from values stored in array
				hsl.h = a[j].h / 360;
				hsl.s = a[j].s / 100;
				hsl.l = lumChange(hsl.l, a[j].l / 50);

				//get new rgb value
				var newRgb = hslToRgb(hsl.h, hsl.s, hsl.l);

				data[i + 0] = newRgb.r; //red
				data[i + 1] = newRgb.g; //green
				data[i + 2] = newRgb.b; //blue
				data[i + 3] = 255; // alpha
			}
			//if pixel alpha is slightly transparent. equation from http://stackoverflow.com/questions/7438263/alpha-compositing-algorithm-blend-modes
			else if( a[j].img.data[i + 3] > 0) {

				//break up rgb to hsl, so we can manipulate color
				var hsl = rgbToHsl( a[j].img.data[i + 0], a[j].img.data[i + 1], a[j].img.data[i + 2]);

				//add in h and s from values stored in array
				hsl.h = a[j].h / 360;
				hsl.s = a[j].s / 100;
				hsl.l = lumChange(hsl.l, a[j].l / 50);

				//get new rgb value
				var newRgb = hslToRgb(hsl.h, hsl.s, hsl.l);

				var d_a = data[i + 3] / 255, 
				a_a = a[j].img.data[i + 3] / 255,
				final_a = a_a + d_a - a_a * d_a; 

				//liner blend
				data[i + 0] = (newRgb.r * a_a + data[i + 0] * d_a * (1 - a_a)) / (final_a);
				data[i + 1] = (newRgb.g * a_a + data[i + 1] * d_a * (1 - a_a)) / (final_a);
				data[i + 2] = (newRgb.b * a_a + data[i + 2] * d_a * (1 - a_a)) / (final_a);

				data[i + 3] = final_a * 255; // alpha

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