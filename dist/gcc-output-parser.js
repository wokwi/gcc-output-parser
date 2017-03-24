(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.GccOutputParser = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

var Message = function Message() {};

Message.prototype.fromGcc = function fromGcc(components, stdout) {
	this.filename = components[1];
	this.line = parseInt(components[2]);
	this.column = parseInt(components[3]);
	this.type = components[4];
	this.text = components[5];
	this.codeWhitespace = components[6];
	this.code = components[7];

	this.adjustedColumn = this.column - this.codeWhitespace.length;
	this.startIndex = stdout.indexOf(components[0]);
	this.endIndex = this.startIndex + components[0].length;
	this.parentFunction = this._lookbackFunction(stdout, this.startIndex);

	return this;
}

Message.prototype.fromLinker = function fromGcc(components, stdout) {
	this.filename = components[1];
	this.line = parseInt(components[2]);
	this.column = 0;
	this.type = 'error';
	this.subtype = components[3];
	this.affectedSymbol = components[5];
	this.text = this.subtype + ' ' + components[4] + ' "' + this.affectedSymbol + '"';

	this.startIndex = stdout.indexOf(components[0]);
	this.endIndex = this.startIndex + components[0].length;
	this.parentFunction = this._lookbackFunction(stdout, this.startIndex);

	if (this.subtype === 'multiple definition') {
		this.firstDefined = this._lookupFirstDefinition(stdout, this.endIndex);
	}

	return this;
}

Message.prototype._matchAll = function _matchAll(regex, input) {
	var match = null;
	var matches = [];
	while (match = regex.exec(input)) {
		matches.push(match);
	}
	return matches;
}

Message.prototype._lookbackFunction = function _lookbackFunction(stdout, index) {
	var regex = /In function\s(`|')(.*)'/g;
	var matches = this._matchAll(regex, stdout.slice(0, index));
	if (matches.length) {
		return matches.slice(-1)[0][2];
	}
	return;
}

Message.prototype._lookupFirstDefinition = function _lookupFirstDefinition(stdout, index) {
	var regex = /:(.*):(\d+): first defined here/g;

	var matches = this._matchAll(regex, stdout.slice(index));
	if (matches.length) {
		return {
			filename: matches[0][1],
			line: parseInt(matches[0][2])
		};
	}
	return;
}

module.exports = Message;

},{}],2:[function(require,module,exports){
'use strict';
var Message = require('./Message');

module.exports = {
	parseString: function parseString(stdout) {
		stdout = stdout.toString();

		var messages = [].concat(
			this.parseGcc(stdout),
			this.parseLinker(stdout)
		);

		return messages;
	},

	parseGcc: function parseGcc(stdout) {
		var regex = /([^:^\n]+):(\d+):(\d+):\s(\w+\s*\w*):\s(.+)\n(\s+)(.*)\s+\^+/gm;
		//            ^          ^     ^       ^       ^     ^    ^
		//            |          |     |       |       |     |    +- affected code
		//            |          |     |       |       |     +- whitespace before code
		//            |          |     |       |       +- message text
		//            |          |     |       +- type (error|warning|note)
		//            |          |     +- column
		//            |          +- line
		//            +- filename

		var messages = [];
		var match = null;
		while (match = regex.exec(stdout)) {
			messages.push(new Message().fromGcc(match, stdout));
		}

		return messages;
	},

	parseLinker: function parseLinker(stdout) {
		var regex = /(.*):(\d+):\s(.*)\s(to|of)\s`(.*)'/g;

		var messages = [];
		var match = null;
		while (match = regex.exec(stdout)) {
			messages.push(new Message().fromLinker(match, stdout));
		}

		return messages;
	}
};

},{"./Message":1}]},{},[2])(2)
});