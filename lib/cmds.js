﻿function getChainsawCommand(s) {
    var regexCmds = [
        { cmd: 'if', reg: /^\s*if\s*\((.*)\)/,br:true },
        { cmd: 'foreach', reg: /^foreach\s*\(\s*var\s+([^\s;]*)\s+in\s+(.*)*\)/, br: true },
        { cmd: 'forloop', reg: /^\s*for\s*\(\s*var\s+(\w+)\s*=\s*([^;\s]+)\s*;\s*([^;]+)\s*;\s*([^\[]*)\)/, br: true },  //for (var {1} = {2}; {3} ; {4})
        { cmd: 'render', reg: /^\s*render\s+([^';\n\r]+)/, br: false }, //render {1}
        { cmd: 'layout', reg: /^layout\s+([^;'\n\r]+)/, br: false },
        { cmd: 'renderBody', reg: /^(renderBody)\s*/, br: false },
        { cmd: 'switch', reg: /^switch\s*\(([^\n]+)\)/, br: true },
        { cmd: 'code', reg: /^\[\[([\s\S]*?)\]\]/, br: true }
    ];

    for (var i = 0; i < regexCmds.length; i++) {
        var o = regexCmds[i];
        var match = s.match(o.reg);
        if (match) {
            return { cmd: o.cmd, match: match, br:o.br };
        }
    }
    return null;
}

module.exports = getChainsawCommand;
