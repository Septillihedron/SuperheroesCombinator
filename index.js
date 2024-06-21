
async function download() {
    const inputFiles = getInputFiles()
    if (inputFiles.length < 2) {
        alert("Invalid number of files, has to be >= 2")
		return
    }
    const maxCombinations = getMaxCombinations()
	if (maxCombinations < 2) {
		alert("Invalid max combinations, has to be >= 2")
		return
	}

    disableDownloadButton()

    const heroes = await parseFiles(inputFiles)
    const combinations = createCombinations(heroes, maxCombinations, combineHero)
    const zip = createZipFile(combinations)
    saveZipFile(zip)
}

function getInputFiles() {
    const input = /** @type {HTMLInputElement} */ (document.getElementById("files"))
    return Array.from(input.files ?? [])
}

function getMaxCombinations() {
    const input = /** @type {HTMLInputElement} */ (document.getElementById("combinations"))
    return Number.parseInt(input.value, 10)
}

function disableDownloadButton() {
    const button = /** @type {HTMLButtonElement} */ (document.getElementById("download"))
    button.innerText = "Downloading..."
}

function enableDownloadButton() {
    const button = /** @type {HTMLButtonElement} */ (document.getElementById("download"))
    button.innerText = "Download"
}

/**
 * @param {Blob[]} files
 */
async function parseFiles(files) {
    return Promise.all(files.map(parseFile))
}

/**
 * @typedef {object} Hero
 * @property {string} schema
 * @property {string} name
 * @property {string} colouredName
 * @property {string} skills
 */

const heroRegexes = {
    schema: /^(?<Value> *#.*?)$/ms,
    name: /^(?<Value>[^#]+?): *$/ms,
    colouredName: /^ +colouredName: *(?<Value>.*?)$/ms,
    skills: /^ +skills: *\n(?<Value>.*)/sm
}

/**
 * @param {Blob} file
 * @returns {Promise<Hero>}
 */
async function parseFile(file) {
    let code = await readFileAsText(file)
    code = code.trimEnd()
    const schema = heroRegexes.schema.exec(code)?.groups?.Value
    const name = heroRegexes.name.exec(code)?.groups?.Value
    const colouredName = heroRegexes.colouredName.exec(code)?.groups?.Value
    const skills = heroRegexes.skills.exec(code)?.groups?.Value
    return {
        schema, name, colouredName, skills
    }
}

/**
 * @param {Blob} file
 * @returns {Promise<string>}
 */
function readFileAsText(file) {
    const fileReader = new FileReader()
    fileReader.readAsText(file, "utf-8")
    return new Promise((resolve) => {
        fileReader.addEventListener("loadend", () => {
            resolve(/** @type {string} */ (fileReader.result))
        })
    })
}


/**
 * @template T
 * @template U
 * @param {T[]} values
 * @param {number} maxCombinations
 * @param {(arg0: T[]) => U} combinator
 * @returns {U[]}
 */
function createCombinations(values, maxCombinations, combinator) {
	const combinations = []
	for (let k=2; k<=maxCombinations; k++) {
		const indexes = Array(k).fill(0).map((_, i) => i).reverse()
		
		while (true) {
			const combination = indexes.map(i => values[i]).reverse()
			combinations.push(combinator(combination))
			
			if (indexes[indexes.length - 1] == values.length - k) {
				break;
			}
			
			indexes[0]++
			for (let i=0; i<indexes.length; i++) {
				if (indexes[i] == values.length - i) {
					indexes[i+1]++
				}
			}
			for (let i=indexes.length-1; i>=0; i--) {
				if (indexes[i] == values.length - i) {
					indexes[i] = indexes[i+1] + 1;
				}
			}
		}
	}
	
	return combinations
}

/**
 * @param {Hero[]} heroes
 */
function combineHero(heroes) {
    const name = heroes.map(hero => hero.name).join("And")
    const colouredName = heroes.map(hero => hero.colouredName).join(" + ")
    const description = createCombinedHeroDescription(heroes)
    const skills = heroes.map(hero => hero.skills).join("\n") + "\n"

    return {
		name: name + ".yml",
		content: `${heroes[0].schema}\n${name}: \n  colouredName: ${colouredName}\n  description: ${description}\n  skills: \n${skills}`
	}
}

/**
 * @param {Hero[]} heroes
 */
function createCombinedHeroDescription(heroes) {
    const colouredNames = heroes.map(hero => hero.colouredName);
    let nameList = ""
    for (let i=0; i<heroes.length-1; i++) {
        nameList += colouredNames[i] + ", "
    }
    nameList += "and " + colouredNames[heroes.length-1]
    return `A combination of ${nameList}`
}

/**
 * @param {{name: string, content: string}[]} combinations
 */
function createZipFile(combinations) {
    const zip = new JSZip()
    combinations.forEach(combination => zip.file(combination.name, combination.content))
    return zip
}

/**
 * @param {JSZip} zip
 */
function saveZipFile(zip) {
    zip.generateAsync({ type: "blob" })
        .then(function(/** @type {any} */ content) {
            saveAs(content, "combinations.zip")
            enableDownloadButton()
        })
}

function saveAs(blob, name) {
	const a = document.createElement("a")
	const url = URL.createObjectURL(blob)
	a.href = url
	a.download = name
	a.click()
}
