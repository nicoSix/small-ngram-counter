const fs = require('fs');
const count = require('n-gram-counter');
var lemmatize = require( 'wink-lemmatizer' );

let n = 2
let min = 5
let context = false;
let contextMin = 1;
let contextSize = 1;
let nlimit = false;
let verbs = false;

function isPositiveNumber(num) {
  return num && num.match(/^[0-9]+$/) != null && (Number.parseInt(num) > 0);
};

function processArgs() {
  for (var i = 2; i < process.argv.length; i++) {
    try {
      let pair = process.argv[i].split('=');
      switch (pair[0]) {
        case 'n':
          if (isPositiveNumber(pair[1])) n = Number.parseInt(pair[1]);
          else return false;
          break;

        case 'min':
          if (isPositiveNumber(pair[1])) min = Number.parseInt(pair[1]);
          else return false;
          break;

        case 'nlimit':
          if (isPositiveNumber(pair[1])) nlimit = Number.parseInt(pair[1]);
          else return false;
          break;

        case 'contextmin':
          if (isPositiveNumber(pair[1])) contextMin = Number.parseInt(pair[1]);
          else return false;
          break;

        case 'contextsize':
          if (isPositiveNumber(pair[1])) contextSize = Number.parseInt(pair[1]);
          else return false;
          break;

        case 'context':
          if (pair[1] === 'true') context = true;
          else if (pair[1] === 'false') context = false;
          else return false;
          break;
        
        case 'verbs':
          if (pair[1] === 'true') verbs = true;
          else if (pair[1] === 'false') verbs = false;
          else return false;
          break;

        default:
          return false;
      }
    }
    catch (e) { 
      console.error(e);
      return false;
    }
  }

  return true;
};

function removeItemAll(arr, value) {
  var i = 0;
  while (i < arr.length) {
    if (arr[i] === value) {
      arr.splice(i, 1);
    } else {
      ++i;
    }
  }
  return arr;
};

function getCleanString(str) {
  // replace was weirly not working, had to done it myself
  toClean = [['.', ''], [':', ''], [',', ''], ['"', ''], ['\r\n', ' '], ['\n', ' ']];
  str = str.toLowerCase();

  toClean.forEach(elt => {
    while (str.indexOf(elt[0]) > -1) {
      str = str.replace(elt[0], elt[1]);
    }
  });

  str = str.replace(/  +/g, ' ');
  return str;
}

function displayContextWords(words, array) {
  let contextCounter = {};

  for (let i = 0; i < array.length; i++) {
    let ngramFound = true;
    for (let j = 0; j < words.length; j++) {
      if (array[i + j] !== words[j]) ngramFound = false;
    }

    if (ngramFound) {
      let borneInf = i - contextSize > -1 ? i - contextSize : 0;
      let borneSup = (contextSize + i + words.length) < array.length ? (contextSize + i + words.length) : array.length - 1;
      let contextString = [...array.slice(borneInf, i), ...words, ...array.slice(i + words.length, borneSup)].join(' ');
      if (!contextCounter[contextString]) contextCounter[contextString] = 1;
      else contextCounter[contextString]++;
    }
  }

  console.log('Context examples:');
  Object.keys(contextCounter).forEach(key => {
    if (contextCounter[key] >= contextMin) console.log('- ' + key + ' (found ' + contextCounter[key] + ' times).');
  })
};

function transformAndFilter(bufferWordArray, bufferExcludedArray = []) {
  var wordArray = getCleanString(bufferWordArray.toString()).split(' ');
  wordArray.map(word => lemmatize.adjective(word));
  wordArray.map(word => lemmatize.noun(word));
  wordArray.map(word => lemmatize.verb(word));
  var excludedArray = getCleanString(bufferExcludedArray.toString()).split(' ');
  excludedArray.map(excludedWord => wordArray = removeItemAll(wordArray, excludedWord))

  return wordArray;
};

function run() {
  var bufferWordArray = fs.readFileSync('text.txt');
  var bufferExcludedArray = fs.readFileSync('excluded.txt');
  wordArray = transformAndFilter(bufferWordArray, bufferExcludedArray);

  var bufferVerbsArray = fs.readFileSync('verbs.txt');
  verbsArray = transformAndFilter(bufferVerbsArray);
  // For debug
  fs.writeFileSync('filteredlist.txt', wordArray.join(' '));
  let counts = count({ data: wordArray, n });
  if (nlimit) counts = counts.slice(0, nlimit);

  counts.map(ngram => {
    if (ngram[1] > min && (!verbs || verbsArray.indexOf(ngram[0][0]) > -1)) {
      console.log('\n' + n + '-gram found ' + ngram[1] + ' times: ' + ngram[0].join(' + '));
      if (context) displayContextWords(ngram[0], [...wordArray]);
      console.log('-'.repeat(52));
    }
  })
};

if (processArgs()) {
  console.log('-'.repeat(20) + ' PARAMETERS ' + '-'.repeat(20));
  console.log('Counting ' + n + '-grams, threshold ' + min + '.');
  if (context) console.log('Contextual words displayed, threshold ' + contextMin + '.');
  console.log('-'.repeat(52));
  run();
} else {
  console.log('Bad usage. Specify an option like this: <arg>=<value>. Available options:\n' +
  '- n (numeric): number of grams.\n' +
  '- min (numeric): minimal ngrams found to be displayed.\n' +
  '- verbs (boolean): requires first word of the ngram to be a verb\n' +
  '- context (boolean): display close words\n' +
  '- contextsize (numeric): amount of context words displayed\n' +
  '- contextmin (numeric): minimal amount of same context words to be displayed.')
}

