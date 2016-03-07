function getIndicesOfBrackets(str) { //this func returns the first outer set of [[]] or @+[[]] in the given string
    var myRe = /(\[\[)|(\]\])|(@)/g;

    var arr = [];
    var match;
    var openCounter = 0;
    var getChainsawCommand = require('./cmds');
    while ((match = myRe.exec(str)) !== null) {
        if (str[myRe.lastIndex - 3] == '*' && str[myRe.lastIndex - 4] == '*') //**[[ is an escape
            if (!arr.length) { //if it's the first match found we'll need to evaulate it
                return {
                    open: myRe.lastIndex - 4,
                    close: myRe.lastIndex,
                    before: myRe.lastIndex - 4,
                    after: myRe.lastIndex
                };
            } else {
                continue;
            }


        var startComment = str.substring(0, myRe.lastIndex).lastIndexOf("<!--"); //ignore brackets found in html comments <!---->
        if (startComment > -1) {
            var closeComment = str.substring(startComment).indexOf("-->");
            if (closeComment > -1 && startComment + closeComment > myRe.lastIndex - 2)
                continue;
        }

        if (!arr.length && match[0] == "@") { //if the first thing we find is a @
            var open = myRe.lastIndex;
            var cmd = getChainsawCommand(str.substring(open)); //check that the @ is a know command, if not, ignore it
            if (cmd) {

                str = str.substring(open);
                var br = cmd.br ? getIndicesOfBrackets(str) : undefined;

                if (cmd.br&&!br) {
                    throw new Error("missing brackets after " + cmd.cmd + " statement at " + str.substring(0, str.indexOf('\n')));
                }
                var close = open;
                if (cmd.cmd == "if") { //we found an if block
                    close += br.after;
                    str = str.substring(br.after);

                    while (/^\s*\n*else\s+\n*if/.test(str)) { //get through all the else if's
                        br = getIndicesOfBrackets(str);
                        close += br.after;
                        str = str.substring(br.after);
                    }

                    if (/^\s*\n*else\s*\n*\[\[/.test(str)) { //get to the end of the else block
                        br = getIndicesOfBrackets(str);
                        close += br.after;
                    }


                } else if (cmd.cmd == "switch") { //if we found a switch case block
                    close += br.after;
                    str = str.substring(br.after);
                    while (/^\n*\s*case\s+.*\n*\s*\[\[/.test(str)) { //get through all cases
                        br = getIndicesOfBrackets(str);
                        close += br.after;
                        str = str.substring(br.after);

                    }

                } else if (cmd.cmd == "render" || cmd.cmd == "layout" || cmd.cmd == "renderBody") { //if we found a render cmd

                    close += cmd.match[0].length;
                } else {
                    close += br.after;
                }
                return {
                    open: open,
                    close: close,
                    before: open - 1,
                    after: close
                };
            }
        }

        while (match[0]==']]'&&str[myRe.lastIndex] == ']') { //in case of [[myArray[1]]] . we want the last two closing brackets, not the first two.
            myRe.lastIndex++;
        }

        arr.push({
            bracket: match[0],
            index: myRe.lastIndex
        });

        if (match[0] == '[[') {
            openCounter++;
        } else if (match[0] == ']]') {
            openCounter--;
        }

        if (arr.length == 1 && arr[0].bracket == ']]') { //the first match found can't be a closing bracket
            throw new Error("bad syntax" + "\n " + str.substr(str.length - 50));
        } else if (arr.length > 1 && openCounter == 0) {
            return {
                open: arr[0].index,
                close: arr[arr.length - 1].index - 2,
                before: arr[0].index - 2,
                after: arr[arr.length - 1].index
            };
        }
    }
    if (arr.length && openCounter > 0)  //if we found an odd amount of brackets, something must be missing
        throw new Error("bad syntax: missing closing brackets ']]' \n file: " + fileCurrentlyProcessing) + "\n " + str.substring(0, 50);

    return null;
}

module.exports = getIndicesOfBrackets;