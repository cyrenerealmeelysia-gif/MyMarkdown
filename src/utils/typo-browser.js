/**
 * typo-js — browser-safe ESM version.
 *
 * Original: https://github.com/cfinke/Typo.js
 * Modified to remove Node.js `require("fs")` auto-load path.
 * We always provide affData + wordsData directly, so _readFile is never needed.
 */
var Typo;
(function () {
  "use strict";

  Typo = function (dictionary, affData, wordsData, settings) {
    settings = settings || {};
    this.dictionary = null;
    this.rules = {};
    this.dictionaryTable = new Map();
    this.compoundRules = [];
    this.compoundRuleCodes = {};
    this.replacementTable = [];
    this.flags = settings.flags || {};
    this.memoized = {};
    this.loaded = false;
    var self = this;
    var i, j, _len, _jlen;

    if (dictionary) {
      self.dictionary = dictionary;
      if (affData && wordsData) {
        setup();
      }
      // NOTE: auto-load path removed — we always provide data inline
    }

    function setup() {
      self.rules = self._parseAFF(affData);
      self.compoundRuleCodes = {};
      for (i = 0, _len = self.compoundRules.length; i < _len; i++) {
        var rule = self.compoundRules[i];
        for (j = 0, _jlen = rule.length; j < _jlen; j++) {
          self.compoundRuleCodes[rule[j]] = [];
        }
      }
      if ("ONLYINCOMPOUND" in self.flags) {
        self.compoundRuleCodes[self.flags.ONLYINCOMPOUND] = [];
      }
      self.dictionaryTable = self._parseDIC(wordsData);
      for (i in self.compoundRuleCodes) {
        if (self.compoundRuleCodes[i].length === 0) {
          delete self.compoundRuleCodes[i];
        }
      }
      for (i = 0, _len = self.compoundRules.length; i < _len; i++) {
        var ruleText = self.compoundRules[i];
        var expressionText = "";
        for (j = 0, _jlen = ruleText.length; j < _jlen; j++) {
          var character = ruleText[j];
          if (character in self.compoundRuleCodes) {
            expressionText += "(" + self.compoundRuleCodes[character].join("|") + ")";
          } else {
            expressionText += character;
          }
        }
        self.compoundRules[i] = new RegExp('^' + expressionText + '$', "i");
      }
      self.loaded = true;
      if ((settings === null || settings === void 0 ? void 0 : settings.asyncLoad) && (settings === null || settings === void 0 ? void 0 : settings.loadedCallback)) {
        settings.loadedCallback(self);
      }
    }
    return this;
  };

  Typo.prototype = {
    load: function (obj) {
      for (var i in obj) {
        if (obj.hasOwnProperty(i)) {
          this[i] = obj[i];
        }
      }
      return this;
    },

    // _readFile removed — we always pass dictionary data directly to the constructor

    _parseAFF: function (data) {
      var rules = {};
      var line, subline, numEntries, lineParts;
      var i, j, _len, _jlen;
      var lines = data.split(/\r?\n/);
      for (i = 0, _len = lines.length; i < _len; i++) {
        line = this._removeAffixComments(lines[i]);
        line = line.trim();
        if (!line) { continue; }
        var definitionParts = line.split(/\s+/);
        var ruleType = definitionParts[0];
        if (ruleType === "PFX" || ruleType === "SFX") {
          var ruleCode = definitionParts[1];
          var combineable = definitionParts[2];
          numEntries = parseInt(definitionParts[3], 10);
          var entries = [];
          for (j = i + 1, _jlen = i + 1 + numEntries; j < _jlen; j++) {
            subline = lines[j];
            lineParts = subline.split(/\s+/);
            var charactersToRemove = lineParts[2];
            var additionParts = lineParts[3].split("/");
            var charactersToAdd = additionParts[0];
            if (charactersToAdd === "0") charactersToAdd = "";
            var continuationClasses = this.parseRuleCodes(additionParts[1]);
            var regexToMatch = lineParts[4];
            var entry = { add: charactersToAdd };
            if (continuationClasses.length > 0) entry.continuationClasses = continuationClasses;
            if (regexToMatch !== ".") {
              if (ruleType === "SFX") {
                entry.match = new RegExp(regexToMatch + "$");
              } else {
                entry.match = new RegExp("^" + regexToMatch);
              }
            }
            if (charactersToRemove != "0") {
              if (ruleType === "SFX") {
                entry.remove = new RegExp(charactersToRemove + "$");
              } else {
                entry.remove = charactersToRemove;
              }
            }
            entries.push(entry);
          }
          rules[ruleCode] = { "type": ruleType, "combineable": (combineable === "Y"), "entries": entries };
          i += numEntries;
        } else if (ruleType === "COMPOUNDRULE") {
          numEntries = parseInt(definitionParts[1], 10);
          for (j = i + 1, _jlen = i + 1 + numEntries; j < _jlen; j++) {
            line = lines[j];
            lineParts = line.split(/\s+/);
            this.compoundRules.push(lineParts[1]);
          }
          i += numEntries;
        } else if (ruleType === "REP") {
          lineParts = line.split(/\s+/);
          if (lineParts.length === 3) {
            this.replacementTable.push([lineParts[1], lineParts[2]]);
          }
        } else {
          this.flags[ruleType] = definitionParts[1];
        }
      }
      return rules;
    },

    _removeAffixComments: function (line) {
      if (line.match(/^\s*#/)) { return ''; }
      return line;
    },

    _parseDIC: function (data) {
      data = this._removeDicComments(data);
      var lines = data.split(/\r?\n/);
      var dictionaryTable = new Map();
      function addWord(word, rules) {
        if (!dictionaryTable.has(word)) { dictionaryTable.set(word, null); }
        if (rules.length > 0) {
          if (dictionaryTable.get(word) === null) { dictionaryTable.set(word, []); }
          dictionaryTable.get(word).push(rules);
        }
      }
      for (var i = 1, _len = lines.length; i < _len; i++) {
        var line = lines[i];
        if (!line) { continue; }
        var just_word_and_flags = line.replace(/\s.*$/, '');
        var parts = just_word_and_flags.split('/', 2);
        var word = parts[0];
        if (parts.length > 1) {
          var ruleCodesArray = this.parseRuleCodes(parts[1]);
          if (!("NEEDAFFIX" in this.flags) || ruleCodesArray.indexOf(this.flags.NEEDAFFIX) === -1) {
            addWord(word, ruleCodesArray);
          }
          for (var j = 0, _jlen = ruleCodesArray.length; j < _jlen; j++) {
            var code = ruleCodesArray[j];
            var rule = this.rules[code];
            if (rule) {
              var newWords = this._applyRule(word, rule);
              for (var ii = 0, _iilen = newWords.length; ii < _iilen; ii++) {
                var newWord = newWords[ii];
                addWord(newWord, []);
                if (rule.combineable) {
                  for (var k = j + 1; k < _jlen; k++) {
                    var combineCode = ruleCodesArray[k];
                    var combineRule = this.rules[combineCode];
                    if (combineRule) {
                      if (combineRule.combineable && (rule.type != combineRule.type)) {
                        var otherNewWords = this._applyRule(newWord, combineRule);
                        for (var iii = 0, _iiilen = otherNewWords.length; iii < _iiilen; iii++) {
                          var otherNewWord = otherNewWords[iii];
                          addWord(otherNewWord, []);
                        }
                      }
                    }
                  }
                }
              }
            }
            if (code in this.compoundRuleCodes) {
              this.compoundRuleCodes[code].push(word);
            }
          }
        } else {
          addWord(word.trim(), []);
        }
      }
      return dictionaryTable;
    },

    _removeDicComments: function (data) {
      data = data.replace(/^\t.*$/mg, "");
      return data;
    },

    parseRuleCodes: function (textCodes) {
      if (!textCodes) {
        return [];
      } else if (!("FLAG" in this.flags)) {
        return textCodes.split("");
      } else if (this.flags.FLAG === "long") {
        var flags = [];
        for (var i = 0, _len = textCodes.length; i < _len; i += 2) {
          flags.push(textCodes.substr(i, 2));
        }
        return flags;
      } else if (this.flags.FLAG === "num") {
        return textCodes.split(",");
      } else if (this.flags.FLAG === "UTF-8") {
        return Array.from(textCodes);
      } else {
        return textCodes.split("");
      }
    },

    _applyRule: function (word, rule) {
      var entries = rule.entries;
      var newWords = [];
      for (var i = 0, _len = entries.length; i < _len; i++) {
        var entry = entries[i];
        if (!entry.match || word.match(entry.match)) {
          var newWord = word;
          if (entry.remove) { newWord = newWord.replace(entry.remove, ""); }
          if (rule.type === "SFX") {
            newWord = newWord + entry.add;
          } else {
            newWord = entry.add + newWord;
          }
          newWords.push(newWord);
          if ("continuationClasses" in entry) {
            for (var j = 0, _jlen = entry.continuationClasses.length; j < _jlen; j++) {
              var continuationRule = this.rules[entry.continuationClasses[j]];
              if (continuationRule) {
                newWords = newWords.concat(this._applyRule(newWord, continuationRule));
              }
            }
          }
        }
      }
      return newWords;
    },

    check: function (aWord) {
      if (!this.loaded) { throw "Dictionary not loaded."; }
      if (!aWord) { return false; }
      var trimmedWord = aWord.replace(/^\s\s*/, '').replace(/\s\s*$/, '');
      if (this.checkExact(trimmedWord)) { return true; }
      if (trimmedWord.toUpperCase() === trimmedWord) {
        var capitalizedWord = trimmedWord[0] + trimmedWord.substring(1).toLowerCase();
        if (this.hasFlag(capitalizedWord, "KEEPCASE")) { return false; }
        if (this.checkExact(capitalizedWord)) { return true; }
        if (this.checkExact(trimmedWord.toLowerCase())) { return true; }
      }
      var uncapitalizedWord = trimmedWord[0].toLowerCase() + trimmedWord.substring(1);
      if (uncapitalizedWord !== trimmedWord) {
        if (this.hasFlag(uncapitalizedWord, "KEEPCASE")) { return false; }
        if (this.checkExact(uncapitalizedWord)) { return true; }
      }
      return false;
    },

    checkExact: function (word) {
      if (!this.loaded) { throw "Dictionary not loaded."; }
      var ruleCodes = this.dictionaryTable.get(word);
      var i, _len;
      if (typeof ruleCodes === 'undefined') {
        if ("COMPOUNDMIN" in this.flags && word.length >= this.flags.COMPOUNDMIN) {
          for (i = 0, _len = this.compoundRules.length; i < _len; i++) {
            if (word.match(this.compoundRules[i])) { return true; }
          }
        }
      } else if (ruleCodes === null) {
        return true;
      } else if (typeof ruleCodes === 'object') {
        for (i = 0, _len = ruleCodes.length; i < _len; i++) {
          if (!this.hasFlag(word, "ONLYINCOMPOUND", ruleCodes[i])) { return true; }
        }
      }
      return false;
    },

    hasFlag: function (word, flag, wordFlags) {
      if (!this.loaded) { throw "Dictionary not loaded."; }
      if (flag in this.flags) {
        if (typeof wordFlags === 'undefined') {
          var tableEntry = this.dictionaryTable.get(word);
          wordFlags = tableEntry ? Array.prototype.concat.apply([], tableEntry) : [];
        }
        if (wordFlags && wordFlags.indexOf(this.flags[flag]) !== -1) { return true; }
      }
      return false;
    },

    alphabet: "",

    suggest: function (word, limit) {
      if (!this.loaded) { throw "Dictionary not loaded."; }
      limit = limit || 5;
      if (this.memoized.hasOwnProperty(word)) {
        var memoizedLimit = this.memoized[word]['limit'];
        if (limit <= memoizedLimit || this.memoized[word]['suggestions'].length < memoizedLimit) {
          return this.memoized[word]['suggestions'].slice(0, limit);
        }
      }
      if (this.check(word)) return [];
      for (var i = 0, _len = this.replacementTable.length; i < _len; i++) {
        var replacementEntry = this.replacementTable[i];
        if (word.indexOf(replacementEntry[0]) !== -1) {
          var correctedWord = word.replace(replacementEntry[0], replacementEntry[1]);
          if (this.check(correctedWord)) { return [correctedWord]; }
        }
      }
      if (!this.alphabet) {
        this.alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
        if ('TRY' in this.flags) { this.alphabet += this.flags['TRY']; }
        if ('WORDCHARS' in this.flags) { this.alphabet += this.flags['WORDCHARS']; }
        var alphaArray = this.alphabet.split("");
        alphaArray.sort();
        var alphaHash = {};
        for (var i = 0; i < alphaArray.length; i++) { alphaHash[alphaArray[i]] = true; }
        this.alphabet = '';
        for (var i in alphaHash) { this.alphabet += i; }
      }
      var self = this;

      function edits1(words, known_only) {
        var rv = {};
        var i, j, _iilen, _len, _jlen, _edit;
        var alphabetLength = self.alphabet.length;
        for (var word_1 in words) {
          for (i = 0, _len = word_1.length + 1; i < _len; i++) {
            var s = [word_1.substring(0, i), word_1.substring(i)];
            if (s[1]) {
              _edit = s[0] + s[1].substring(1);
              if (!known_only || self.check(_edit)) { rv[_edit] = (rv[_edit] || 0) + 1; }
            }
            if (s[1].length > 1 && s[1][1] !== s[1][0]) {
              _edit = s[0] + s[1][1] + s[1][0] + s[1].substring(2);
              if (!known_only || self.check(_edit)) { rv[_edit] = (rv[_edit] || 0) + 1; }
            }
            if (s[1]) {
              var lettercase = (s[1].substring(0, 1).toUpperCase() === s[1].substring(0, 1)) ? 'uppercase' : 'lowercase';
              for (j = 0; j < alphabetLength; j++) {
                var replacementLetter = self.alphabet[j];
                if ('uppercase' === lettercase) { replacementLetter = replacementLetter.toUpperCase(); }
                if (replacementLetter != s[1].substring(0, 1)) {
                  _edit = s[0] + replacementLetter + s[1].substring(1);
                  if (!known_only || self.check(_edit)) { rv[_edit] = (rv[_edit] || 0) + 1; }
                }
              }
            }
            if (s[1]) {
              for (j = 0; j < alphabetLength; j++) {
                var lettercase = (s[0].substring(-1).toUpperCase() === s[0].substring(-1) && s[1].substring(0, 1).toUpperCase() === s[1].substring(0, 1)) ? 'uppercase' : 'lowercase';
                var replacementLetter = self.alphabet[j];
                if ('uppercase' === lettercase) { replacementLetter = replacementLetter.toUpperCase(); }
                _edit = s[0] + replacementLetter + s[1];
                if (!known_only || self.check(_edit)) { rv[_edit] = (rv[_edit] || 0) + 1; }
              }
            }
          }
        }
        return rv;
      }

      function correct(word) {
        var _a;
        var ed1 = edits1((_a = {}, _a[word] = true, _a));
        var ed2 = edits1(ed1, true);
        var weighted_corrections = ed2;
        for (var ed1word in ed1) {
          if (!self.check(ed1word)) { continue; }
          weighted_corrections[ed1word] = (weighted_corrections[ed1word] || 0) + ed1[ed1word];
        }
        var i, _len;
        var sorted_corrections = [];
        for (i in weighted_corrections) {
          if (weighted_corrections.hasOwnProperty(i)) {
            if (self.hasFlag(i, "PRIORITYSUGGEST")) { weighted_corrections[i] += 1000; }
            sorted_corrections.push([i, weighted_corrections[i]]);
          }
        }
        function sorter(a, b) {
          if (a[1] < b[1]) return -1;
          else if (a[1] > b[1]) return 1;
          return b[0].localeCompare(a[0]);
        }
        sorted_corrections.sort(sorter).reverse();
        var rv = [];
        var capitalization_scheme = "lowercase";
        if (word.toUpperCase() === word) { capitalization_scheme = "uppercase"; }
        else if (word.substr(0, 1).toUpperCase() + word.substr(1).toLowerCase() === word) { capitalization_scheme = "capitalized"; }
        var working_limit = limit;
        for (i = 0; i < Math.min(working_limit, sorted_corrections.length); i++) {
          if ("uppercase" === capitalization_scheme) { sorted_corrections[i][0] = sorted_corrections[i][0].toUpperCase(); }
          else if ("capitalized" === capitalization_scheme) { sorted_corrections[i][0] = sorted_corrections[i][0].substr(0, 1).toUpperCase() + sorted_corrections[i][0].substr(1); }
          if (!self.hasFlag(sorted_corrections[i][0], "NOSUGGEST") && rv.indexOf(sorted_corrections[i][0]) === -1) {
            rv.push(sorted_corrections[i][0]);
          } else { working_limit++; }
        }
        return rv;
      }

      this.memoized[word] = { 'suggestions': correct(word), 'limit': limit };
      return this.memoized[word]['suggestions'];
    }
  };
})();

export default Typo;
