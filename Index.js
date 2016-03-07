function chainsaw(p, params, fn) {

    var fs = require('fs');
    var vm = require('vm');
    var getIndicesOfBrackets = require('./lib/br');
    var getChainsawCommand = require('./lib/cmds');
    var handler = new handlerO();
    var scopes = [];
    scopes.push(params || {});

    var fileName = p;
    GLOBAL.fileCurrentlyProcessing = fileName;
    var res;

    try {
        res = renderHtml(readFile(fileName));
    } catch (ex) {
        if (!fn)
            throw ex;
        else return fn(ex);
    }
    return fn ? fn(null, res) : res;

    function readFile(file) {

        if (file.indexOf('.') == -1) {
            file += '.cshtml';
        }
        //before rendering the page, we check for layouts and render them first
        var data = fs.readFileSync(file, 'utf8');
        var match = data.match(/@layout\s+([^;'\n\r]+)/); //layout {1} -> the layout html
        if (match && match[1]) {
            fileCurrentlyProcessing = match[1];
            var layout = renderHtml(readFile(match[1]));
            fileCurrentlyProcessing = file;
            data = layout.replace('[[renderBody]]', data);
        }
        return data;
    }


    function renderHtml(data) {
        var html = '';

        var br = getIndicesOfBrackets(data);


        if (!br) {
            return data; //no code to evalute, return plain HTML
        }


        html += data.substr(0, br.before); //render everything up to the opening bracket
        html += evaluateCode(data.substring(br.open, br.close)); //evaluate the code we found
        html += renderHtml(data.substr(br.after)); //recursively render the rest of the file

        return html;
    };


    function evaluateCode(data) {
        var match, cmd = getChainsawCommand(data);

        if (cmd) {
            switch (cmd.cmd) {
                case "if":
                    return handler.ifBlock(cmd.match, data);

                case "foreach": //foreach(var {1} in {2})
                    return handler.foreach(cmd.match, data);

                case "forloop":  //for (var {1} = {2}; {3} ; {4})
                    return handler.forloop(cmd.match, data);
                case "render": //render {1}
                    return handler.render(cmd.match);
                case "switch":
                    return handler.switch(cmd.match, data);
                case "layout":  //layout command, remove;
                    return '';
                case "renderBody": //renderBody command, to be ignored - handled later;
                    return '[[renderBody]]';
                case "code": //code block
                    return handler.code(cmd.match);
            }
        }


        match = data.match(/^\s*\*\*(\[\[)/); //escape [[ 
        if (match && match[1]) {

            return match[1];
        }
        match = data.match(/^\s*\*\*(\]\])/); //escape ]]
        if (match && match[1]) {

            return match[1];
        }


        match = data.match(/^\s*var\s+(\w+)\s*(?:=\s*([^;]+))?\s*/); //var {0} = {1} -> '= {1}' is optional

        if (match) {
            return handler.var(match);
        }

        return executeCode(data); //anything else

    }



    function handlerO() {

        this.ifBlock = function (m, data) {

            var match = m[1], res, br = getIndicesOfBrackets(data);

            if (executeCode(match)) { //if true

                if (!br) {
                    throw new Error("missing brackets after if statement");
                }

                addScope();
                res = renderHtml(data.substring(br.open, br.close));

                removeScope();

                return res;
            } else { //if false
                match = data.substring(br.after).match(/^\s*else\s+if\s*\((.*)\)/);

                if (match && match[1]) { //else if(...)

                    return this.ifBlock(match, data.substring(br.after));
                }
                match = data.substring(br.after).match(/^\s*(else)\s*/);

                if (match && match[1]) { //else

                    data = data.substring(br.after);
                    br = getIndicesOfBrackets(data);
                    if (!br) {
                        throw new Error("missing brackets after else statement");
                    }
                    addScope();
                    res = renderHtml(data.substring(br.open, br.close));
                    removeScope();
                    return res;
                }
            }

            return '';
        }

        this.foreach = function (match, data) {
            var arr = executeCode(match[2]), //collection
     item = match[1], //the item
     html = '';

            var br = getIndicesOfBrackets(data);
            if (!br) {
                throw new Error("missing brackets after foreach statement");
            }
            if (!arr) {
                throw new Error("missing or invalid collection in foreach statement");
            }

            if (typeof arr == 'object' && arr.length == undefined)  //if the collection is an object
                arr = Object.keys(arr);


            for (var i = 0; i < arr.length; i++) {
                addScope();
                addParamToScope(item, arr[i]);
                html += renderHtml(data.substring(br.open, br.close));
                removeScope();
            }


            return html;
        }

        this.forloop = function (match, data) {

            var index = match[1], //for(var index = value; condition; increment)
                value = executeCode(match[2]),
                html = '',
                condition = match[3],
                increment = match[4],
                infiniteCatcher = 0;


            var br = getIndicesOfBrackets(data);
            if (!br) {
                throw new Error("missing brackets after for loop statement");
            }
            addScope();
            addParamToScope(index, value);

            while (executeCode(condition)) {
                if (++infiniteCatcher > 5000)
                    throw new Error("possible infinite loop detected. " + infiniteCatcher + " iterations at " + data.substring(0, data.indexOf('\n')));
                addScope();
                html += renderHtml(data.substring(br.open, br.close));
                removeScope();
                executeCode(increment);
            }
            removeScope();
            return html;
        }

        this.var = function (match) { //add var to current scope
            var variable = match[1], value = match[2];
            addParamToScope(variable, executeCode(value));
            return '';
        }

        this.render = function (match) {  //render {1}
            var tempFile = fileCurrentlyProcessing;
            fileCurrentlyProcessing = match[1];
            addScope();
            var result = readFile(fileCurrentlyProcessing);
            removeScope();
            fileCurrentlyProcessing = tempFile;
            return renderHtml(result);
        }

        this.switch = function (m, data) {

            var sw = executeCode(m[1]),
                match, regex = /case\s*(.*)(:\s*)/g;

            while ((match = regex.exec(data)) !== null) {

                if (/^default/.test(match[1]) || sw == executeCode(match[1])) { //find the correct case then render between the brackets
                    data = data.substring(regex.lastIndex);
                    var br = getIndicesOfBrackets(data);

                    return renderHtml(data.substring(br.open, br.close));
                }

            }
            return '';
        }

        this.code = function (match) {
            executeCode(match[1], true);

            return '';
        }

    }

    function executeCode(code, isCodeBlock) {

        var flatScope = flattenScopes(); //make all levels of the scope accessable

        if (!isCodeBlock) {
            flatScope.__ChainsawResult = null; //get the result
            code = "__ChainsawResult=(\n" + code + "\n)";
        }
        var context = new vm.createContext(flatScope);
        var script = new vm.Script(code);
        script.runInContext(context);

        updateScopes(flatScope);
        return flatScope.__ChainsawResult;
    }

    function addScope() {
        scopes.push({});
    }

    function removeScope() {
        return scopes.pop();
    }

    function addParamToScope(key, value) {
        scopes[scopes.length - 1][key] = value;
    }

    function flattenScopes() { //before executing code, we make all levels of the scope available
        var obj = {};
        scopes.forEach(function (scope) {
            for (var prop in scope) {
                obj[prop] = scope[prop];
            }
        });
        return obj;
    }

    function updateScopes(pars) {  //after executing code, we update the scopes starting from the most 'local' scope.
        for (var prop in pars) {
            for (var i = scopes.length - 1; i > -1; i--) {
                if (scopes[i].hasOwnProperty(prop)) {
                    scopes[i][prop] = pars[prop];
                    break;
                }
            }
        }
    }
}


//express.js
exports.__express = chainsaw;

//stand-alone
exports.render = chainsaw;

//hapi.js
exports.compile = function (f, options) {
    return function (locals) { return chainsaw(options.filename, locals); };
};

