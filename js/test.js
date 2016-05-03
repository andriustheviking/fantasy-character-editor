$(document).ready( function(){

	$('p').html("hello world");

	var x;

	$.ajax ({
		type: "GET",
		url: "./csv/pose_01.csv",
		dataType: "text"
		success: function(data) { parseCsv(data);}
	});
});

function parseCsv(text) {
	var textLines = text.split(/\r\n | \n/);

	var headers = textLines[0].split(',');

	var obj = {};

	for (var i = 1; i < textLines.length; i++) {
		var data = textLines[i].split(',');

		var darr = [];
		for (var j = 0; j < headers.length; j++){
			darr.push( headers[j] + ":" + data[i]);
		}
		obj.push(darr);
	}
}