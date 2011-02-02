/*!
 * fileloader - jQuery Plugin
 *
 * Copyright 2011, Prasad.A
 * Licensed under the MIT
 */

/*!
 * Usage: Basic
 * =============
 * $.fileloader().
 * 	fetch([
 * 		"server.domain/file.js",        // Javascript file
 * 		"server.domain/file.css",       // CSS file
 * 		"server.domain/file.jstmpl"     // jQuery template
 * 		"server.domain/file.css",       // Duplicate (fetch ignored)
 * ]).then(fnToCallPostFetchCompletion);
 *
 * Helper API
 * ===========
 * var content = $.remoteFileContent('server.domain/file.js');
 *
 * Usage: Advanced
 * ===============
 * var f_loader = $.fileloader();
 * f_loader.
 * 	beforeGet(fnToCallBeforeFileFetch). // Optional
 * 	afterGet(fnToCallAfterFileFetch).   // Optional
 * 	fetch([
 * 		"server.domain/file.js",        //
 * 		"server.domain/file.css",       // 
 * 		"server.domain/file.jstmpl"     //
 * 		"server.domain/file.css",       // Duplicate (fetch ignored)
 * ]).then(fnToCallPostFetchCompletion);
 *
 * function fnToCallPostFetchCompletion() {
 *     var content = f_loader.fileContent("server.domain/file.js");
 * }
 */
(function($) {
	/*
	 * Closure class
	 */
	var RemoteFileController = function() {
		this.dfd = $.Deferred();
		this.fileList = [];	
		this.fnBeforeGet = false;
		this.fnAfterGet  = false;
	}
	RemoteFileController.prototype.fetchWithPromise = function(flist) {
		this.fileList = flist;
		this.fetchNext(0);
		return this.dfd.promise();
	}
	RemoteFileController.prototype.fetchNext = function(index) {
		var file = this.fileList[index];

		if (this.isLoaded(file)) {
			this.fetchComplete(index,false,-1,false);
		} else {		
			if (this.fnBeforeGet) {
				this.fnBeforeGet.call(this, file);
			}
		
			$.ajax({
				context: this,
				cache: true,
				url: file,
				success : function(data,textStatus,jqXHR) {
					this.fetchComplete(index,data,1,jqXHR);
				},
				error : function(jqXHR,textStatus,errorThrown) {
					this.fetchComplete(index,false,0,jqXHR);
				}
			});
		}
	}
	RemoteFileController.prototype.fileId = function(file) {
		if (file.match(/\.js$/)) return 'script[id="script://'+file+'"]';
		if (file.match(/\.jstmpl$/)) return 'script[id="tmpl://'+file+'"]';
		if (file.match(/\.css$/)) return 'style[id="style://'+file+'"]';
		return false;
	}
	RemoteFileController.prototype.isLoaded = function(file) {
		var id = this.fileId(file);
		return id? ($(id).length > 0) : false;
	}	
	RemoteFileController.prototype.fileContent  = function(file) {
		var id = this.fileId(file);
		return id? ($(id).text()) : false;
	}	
	RemoteFileController.prototype.fetchComplete = function(index,data,status,jqXHR) {	
		var file = this.fileList[index];
		if (status == 1 /* Success */) {
			if (file.match(/\.js$/)) {
				var scriptNode = document.createElement('script');
				scriptNode.type= 'text/javascript';
				scriptNode.text= data;
				scriptNode.id='script://'+file;
				document.getElementsByTagName("head")[0].appendChild(scriptNode);				
			} else if (file.match(/\.jstmpl$/)) {
				var tmplNode = document.createElement('script');
				tmplNode.type= 'text/x-jquery-tmpl';
				tmplNode.text= data;
				tmplNode.id  = 'tmpl://'+file;
				document.getElementsByTagName("head")[0].appendChild(tmplNode);
			} else if (file.match(/\.css$/)) {
				var styleNode = document.createElement('style');
				styleNode.type= 'text/css';
				styleNode.innerHTML= data;
				styleNode.id  = 'style://'+file;
				document.getElementsByTagName("head")[0].appendChild(styleNode);
			}
		} else if (status == 0 /* Error */ || status == -1 /* Cache */) { }
		
		if (this.fnAfterGet && status != -1 /* not Cached */) {
			this.fnAfterGet.call(this, file, status);
		}
		
		if (index < this.fileList.length-1) {
			this.fetchNext(index+1);
		} else {
			this.dfd.resolve();
		}
	}
	
	/*
	 * Wrapper class to expose methods via $.fileloader
	 */
	var FileLoaderCls = function() { 
		this.controller = new RemoteFileController();
		return this;
	}
	FileLoaderCls.prototype.beforeGet = function(fn) {
		this.controller.fnBeforeGet = fn;
		return this;
	}
	FileLoaderCls.prototype.afterGet = function(fn) {
		this.controller.fnAfterGet = fn;
		return this;
	}
	FileLoaderCls.prototype.fetch = function(files) {
		return this.controller.fetchWithPromise(files);
	}
	FileLoaderCls.prototype.fileContent = function(file) {
		return this.controller.fileContent(file);
	}
	
	/** 
	 * Expose methods via $
	 */
	$.fileloader = function() {  
		return new FileLoaderCls();
	}
	$.remoteFileContent = function(file) {
		var controller = new RemoteFileController();
		return controller.fileContent(file);
	}
	
})(jQuery);
