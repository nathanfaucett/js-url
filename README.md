url
=======

url parsing and objects for the browser and node.js

```javascript
var url = require("@nathanfaucett/url");


var fullUrl = url.parse(
    "http://some_domain.com/path/name?query=string", // url
    true, // parse query string
    false // slashes denote host
);
```
