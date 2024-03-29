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
		this.files = [];	
		this.fnBeforeGet = false;
		this.fnAfterGet  = false;
	}
	
	RemoteFileController.prototype.fileId = function(file) {
		if (file.match(/\.js$/)) return 'script://'+file;
		if (file.match(/\.jstmpl$/)) return 'tmpl://'+file;
		if (file.match(/\.css$/)) return 'style://'+file;
		return false;
	}
	RemoteFileController.prototype.fileDomNode = function(file) {
		var node = document.getElementById(this.fileId(file));
		return node? $(node): false;
	}
	RemoteFileController.prototype.isLoaded = function(file) {
		var node = this.fileDomNode(file);
		return node? true : false;
	}	
	RemoteFileController.prototype.fileContent  = function(file) {
		var node = this.fileDomNode(file);
		if (node) {
			if ($.browser.msie) return node.html();
			else return node.text();
		}
		return false;
	}
	
	RemoteFileController.prototype.fetchWithPromise = function(flist) {
		this.files = flist;
		this.fetchNext(0);
		return this.dfd.promise();
	}
	RemoteFileController.prototype.fetchNext = function(index) {
		var file = this.files[index];
		if (this.isLoaded(file)) {
			this.fetchComplete(index,false,-1,false);
		} else {
			if (this.fnBeforeGet) {
				this.fnBeforeGet.call(this, file);
			}
		
			$.ajax({
				async: false, // To enable fileContent retrieval immediately after fetch completion
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
	RemoteFileController.prototype.fetchComplete = function(index,data,status,jqXHR) {	
		var file = this.files[index];
		if (status == 1 /* Success */ || status == 0 /* Error */) {
			// Custom hanlding - To avoid repeating 404 response, treat fetch-failure as blank data.
			if (status == 0 && !data) data = '';
			
			if (file.match(/\.js$/)) {
				//$('head').append('<script type="text/javascript" id="'+this.fileId(file)+'">'+data+'</script>');
				var scriptNode = document.createElement('script');
				scriptNode.type= 'text/javascript';
				scriptNode.text= data;
				scriptNode.id  = this.fileId(file);
				document.getElementsByTagName("head")[0].appendChild(scriptNode);
								
			} else if (file.match(/\.jstmpl$/)) {
				//$('head').append('<script type="text/x-jquery-tmpl" id="'+this.fileId(file)+'">'+data+'</script>');
				var tmplNode = document.createElement('script');
				tmplNode.type= 'text/x-jquery-tmpl';
				tmplNode.text= data;
				tmplNode.id  = this.fileId(file);
				document.getElementsByTagName("head")[0].appendChild(tmplNode);
			} else if (file.match(/\.css$/)) {
				//$('head').append('<style type="text/css" id="'+this.fileId(file)+'">'+data+"</style>");
				
				// Reference: http://stackoverflow.com/questions/524696/how-to-create-a-style-tag-with-javascript
				var styleNode = document.createElement('style');
				styleNode.setAttribute('type', 'text/css');
				var rulesNode = document.createTextNode(data);
				if (styleNode.styleSheet) styleNode.styleSheet.cssText = rulesNode.nodeValue;
				else styleNode.appendChild(rulesNode);
				styleNode.id  = this.fileId(file);
				document.getElementsByTagName("head")[0].appendChild(styleNode);
			}
		} else if (status == -1 /* Cache */) { }
		
		this.fetchCompleteNext(index, file, status);
	}
	
	RemoteFileController.prototype.fetchCompleteNext = function(index, file, status) {
		if (this.fnAfterGet && status != -1 /* not Cached */) {
			this.fnAfterGet.call(this, file, status);
		}
		
		if (index < this.files.length-1) {
			this.fetchNext(index+1);
		} else {
			//this.dfd.resolve();
			
			// To let browser take space to settle down
			var thisObj = this;
			setTimeout(function(){thisObj.dfd.resolve()}, 0);
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
	FileLoaderCls.prototype.fileContentWithPartialFileName = function(name) {
		var file = $(this.controller.files).filter(function(index,value) { return value.match(new RegExp(name+"$"))});
		return file.length? this.fileContent(file[0]) : false;
	}
	FileLoaderCls.prototype.fileDomNode = function(file) {
		return this.controller.fileDomNode(file);
	}
	FileLoaderCls.prototype.fileDomNodeWithPartialFileName = function(name) {
		var file = $(this.controller.files).filter(function(index,value) { return value.match(new RegExp(name+"$"))});
		return file.length? this.fileDomNode(file[0]) : false;
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
