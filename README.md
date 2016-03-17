
# Chainsaw HTML

Chainsaw.js (cshtml) is an HTML rendering script for Node.js. It can be used with Express.js, Hapi.js or as a stand alone.
The syntax is vaguely based on .NET's Razor.
```
npm install cshtml
```
### Getting Started With Express.js
Simply set the view engine as 'cshtml' and call the response.render function. The first parameter is the name of the file (you don't need the .cshtml extension). The 2nd paramenter is the view model (see [below](#the-view-model)) which is optional.
```
var express = require('express');
var app = express();
app.set('view engine', 'cshtml');

app.get('/', function (req, res) {
   var params = {title: "hello world"};
   res.render('Index', params);
});
app.listen(3000, function () {
    console.log('listening on port 3000');
});
```
### Getting Started With Hapi.js

Chainsaw.js also easily integrated with Hapi.js. If you are unfamiliar with Hapi.js I advise you to review their tutorials. I am showing only the relevant parts because the code is long. Simply define the view engine:
```
        server.views({
            engines: { html: require('cshtml') },
            path: __dirname + '/views'
        });
```
I chose in the above example to work with html files instead of cshtml. You can choose whatever file extension you wish. Then use the standard reply.view command. The first paramater is the name of the file. The second is your object view model.
```
 reply.view('index', {
        title: 'welcome',
        message: 'Index - Hello World!'
    });
};
```

### As A Stand-Alone
First you need to 'require' the cshtml model. Then you use the render function with 3 parameters: 
- the file to be rendered
- the view model (see [below](#the-view-model))
- callback function

The callback function receives two parameters: error (if any) and the result which is the rendered HTML.
```
var http = require('http');
var cshtml = require('cshtml');
var params = {title: "hello world"};

http.createServer(function(request,response){
    response.writeHead(200, {"Content-Type": "text/html"});
    cshtml.render('views/Index.cshtml', params, function (err,res) {
        if(err)
            throw err;
        response.end(res);
    });
}).listen(8000);
```

### The View Model
Just like most HTML rendering scripts you have an object with parameters that you want to sprinkle all over your HTML. Chainsaw.js supports all variables including arrays and functions.
```
var viewModel = {title: "welcome",
                people: [
                         {name: "bob"  ,age:24},
                         {name: "larry",age:32}
                        ],
                printName: function(person){
                    return person.name + " : his age is "+person.age;
                    }
                }
```

### The File Extension
If you're using Express.js, you have use the cshtml extension. If you're using Hapi.js, the file extension is defined in the view engine (see [above](#getting-started-with-hapijs)). If not, you can call them whatever you want, for example: 
- Index.html
- Index.txt
- Index.johnDoe
- etc.

### Interpolation 

Simple double square brackets:
```
<h1>[[title]]</h1>
```
Renders to…
```
<h1>welcome</h1>
```
You can also use interpolation for more complex code (based on the view model above):
```
<h1>[[people.length > 3 ? "long":"short"]]</h1>
<h2>[[ printName(people[0])]]</h2>
```
Renders to …
```
<h1>short</h1>
<h2>bob : his age is 24</h2>
```

### Foreach loops
```
@foreach(var person in people)[[
<span>[[person.name]]</span>   <span>[[person.age]]</span>
]]
```
Renders to…
```
<span>bob</span> <span>24</span>
<span>larry</span> <span>32</span>
```
### For loops
```
@for(var i = 0; i < people.length; i++) [[
<span>[[people[i].name]]</span>   <span>[[people[i].age]]</span>
]]
```
Renders to…
```
<span>bob</span> <span>24</span>
<span>larry</span> <span>32</span>
```
### Conditional Statements (If-Else Blocks)
The if statement starts with a @if()... You can follow it with multiple else if's and of course an else. If's can also be nested within other @if block.
```
@if(people[0].name == "harold") [[
<span>the name is harold</span>
]] else if( people.length == 3) [[
<span>there are 3 people</span>
]] else [[
<span>the sky is blue<span>
]]
```
Renders to…
```
<span>the sky is blue<span>
```
### Switch Case Blocks
A switch case block starts with a @switch(). It's followed by cases. If the case is true, the HTML in the brackets is rendered. You can also add a case default.
```
[[var temp = Math.floor(Math.random() * 5)]]
@switch(temp)
case 0:[[
<div>you got zero!</div>
]]
case 1:[[
    <div>you got only one</div>
]]
case 2:[[
    <div>you got two</div>
]]
case default: [[
        <div>you got [[temp]]</div>
]]
```
### Declaring Variables
You can define variables using this format:
```
[[var temp]]
```
or
```
[[var temp = 12]]
```
If you want to declare a few variables, you'll need to declare them one at a time. Each one in its own brackets ``[[ ]]``.
### Executing Code
Any code you want to execute can be wrapped in a ``@[[  ]]``. Brackets prefixed with the @ symbol will not render anything. Also, important note: any variables declared in these code brackets ``@[[ ]]`` , cannot be accessed outside the code block. If you want to create a variable that is accessible outside the code block, use the ``[[var..]]`` syntax (see [above](#declaring-variables)).
```
[[var avg = 0;]]
@[[
   for(var i = 0; i < people.length;i++){
       avg += people[i].age;
   }
avg = avg / people.length;
]]

<h1>The average age is [[Math.floor(avg)]]</h1>
```
Will render to 
```
<h1>The average age is 28</h1>
```
### Rendering Partials
A partial is a different file which contains more HTML that needs to be inserted into your main HTML page. All view model parameters are available in the partial. In your main file add this line:
```
@render [file path] 
```
##### views/Index.cshtml
```
<div id="people-container">
@foreach(var person in people)[[
   @render views/partials/text.cshtml
]]
</div>
```
##### views/partials/text.cshtml
```
<span>[[person.name]]</span>   <span>[[person.age]]</span>
```
Renders to…
```
<div id="people-container">
<span>bob</span> <span>24</span>
<span>larry</span> <span>32</span>
</div>
```
### Layouts
Using layouts are useful when you want all the pages to have the same header and footer for example. On the main file being rendered you add on top the layout command: 
```
@layout [path to layout file]
```
On the layout file, you have to add the ``@renderBody`` command to specify where the content is supposed to be rendered. You can also work with several layers of layouts:
##### views/Index.cshtml
```
@layout views/innerLayout.cshtml
<div>text text</div>
```
##### innerLayout.cshtml
```
@layout views/layout.html

<div id="container">
    @renderBody
</div>
```
##### Layout.cshtml
```
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8" />
    <title>[[title]]</title>

</head>
    <body>
        @renderBody
    </body>
</html>
```
Renders to...
```
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8" />
    <title>welcome</title>
</head>
<body>
    <div id="container">
        <div>text text</div>
    </div>
</body>
</html>
```
### Escaping The Chainsaw Command Symbol @ And Double Brackets [[ or ]]
The 'chainsaw command symbol @' doesn't need escaping. If it's followed by a space or a command it doesn't recognize it just renders the @ as is.

Double square brackets have to be escaped using two preceding asterisk ``**[[`` and ``**]]``: 
```
**[[title**]]
```
Renders to…
```
[[title]]
```
### Commenting out commands
If any command is wrapped in the usual HTML comment tags, it will be ignored.
```
<!--@render text.cshtml-->
<!--[[name]]-->
```
Renders as…
```
<!--@render text.cshtml-->
<!--[[name]]-->
```
### Questions, Comments, Bugs
Feel free to contact me: davidzalmanson@gmail.com