## Code snippet below demonstrates the use of fileloader plugin ##

```
<!doctype html>
<html>
<head>
    <title>Example: jquery-loader</title>
    <script type="text/javascript" src="jquery.1.5.js"></script>
    <script type="text/javascript" src="jquery.fileloader.js"></script>		
</head>
	
<body>

<div id="loading"></div>
		
<script type="text/javascript">
	var demoController = function() {}
	demoController.prototype = {
            before : function(file) {
                $('#loading').html(file);
            },
            after : function(file,status) {
                $('#loading').empty();
            },
            load   : function() {
                $.fileloader().
                    beforeGet($.proxy(this, 'before')).
                    afterGet($.proxy(this, 'after')).
                    fetch([
			"resources/application.js",
                        "resources/unknown.js",
			"assets/sample.jstmpl",
			"assets/mycontroller.js",
		        "assets/style.css"]).
		   then($.proxy(this, 'last'));
            }
            last : function() {
                $('body').append($.remoteFileContent('assets/sample.jstmpl'));
            },
	}
	$(function() { (new demoController()).load(); });
</script>	
</body>
</html>
```