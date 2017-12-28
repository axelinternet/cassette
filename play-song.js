require('console-warn')
require('console-error')
require('console-info')

const http = require('http')
const fetch = require('node-fetch')
const request = require('request')
const fs = require('fs')
const util = require('util')

const AppData = require('./keys.secret')
/*
	TODO: 
		- Build refresh function so it refreshes if possible when the key has expired. 
		- Build simple web interface
		- Deploy with zeit now
*/

const tapeLibrary = {
/*  
		Sample of how to build up tapeLibrary. This object is what will be used to keep the 
		connection between my service and spotify. Building some sort of funky interface for this
		would be cool. Buiild this as a rest microservice and just build a super simple NUXT or next.js
		site? 
*/ 
	tapes: [
		{
			mer_data: 'get this from API later',
			spotify_uri: 'spotify:album:3AZThW5w8QRSZ0SRhiHARd',
			frequency: 440
		},
		{
			mer_data: 'get this from API later',
			spotify_uri: 'spotify:album:6Y5NQ2C9Jyyi8AQnCfjkx2',
			frequency: 740
		},
		{
			mer_data: 'get this from API later',
			spotify_uri: 'spotify:album:47nWcb5GzhgGNzJuCJgiPN',
			frequency: 2093
		}
	]
}

const generateStateKey = (keyLength = 8) => {
	const allowed = 'abcdefghijklmnopqrstuvxyzABCDEFGHIJKLMNOPQRSTUVXYZ0123456789'
	let key = ''
	for (let i = 0; i < keyLength; i++) {
		key = key + allowed[Math.round(Math.random() * allowed.length)]
	}
	return key
}


const loadKeys = () => {
	const tokens = JSON.parse(fs.readFileSync('keys.secret').toString())
	// TODO: Something to check if token has expired
	return tokens
}

const initilizeServer = (code) => {
	// Run this first with code to get inital accesstoken. Starts server on completion
	const authOptions = {
	  url: 'https://accounts.spotify.com/api/token',
	  form: {
	    code: code,
	    redirect_uri: AppData.redirect_uri,
	    grant_type: 'authorization_code'
	  },
	  headers: {
	    'Authorization': 'Basic ' + (new Buffer(AppData.client_id + ':' + AppData.client_secret).toString('base64'))
	  },
	  json: true

	}

	request.post(authOptions, function(error, response, body) { 
		if (!error && response.statusCode == 200) {
			console.log(body)
			fs.writeFile('tokens.json', JSON.stringify(body), error => {error ? (console.error(error)):null})
			// Start and run server
			const stateKey = generateStateKey()
			run(stateKey)
	  } else {
	  	console.error(error, body)
	  } 
	})
	
}

const refreshToken = (code) => {
	console.log(AppData.tokens)
	// Run this first with code to get inital accesstoken. 
	const authOptions = {
	  url: 'https://accounts.spotify.com/api/token',
	  form: {
	  	refresh_token: AppData.tokens.refresh_token,
	    grant_type: 'refresh_token'
	  },
	  headers: {
	    'Authorization': 'Basic ' + (new Buffer(AppData.client_id + ':' + AppData.client_secret).toString('base64'))
	  },
	  json: true
	}

	request.post(authOptions, function(error, response, body) { 
		if (!error && response.statusCode == 200) {
			console.log(body)
			fs.writeFile('tokens.json', JSON.stringify(body), error => {error ? (console.error(error)):null})
	  } else {
	  	console.error(error, body)
	  } 
	})
	
}

const loadTokens = () => {
	const tokens = JSON.parse(fs.readFileSync('tokens.json').toString())
	// TODO: Something to check if token has expired
	return tokens
}

const makeSimpleQuery = (url) =>  {
	return new Promise((resolve, reject) => {
		const query = {
			url: url,
			headers: {
				'Authorization': 'Bearer ' + AppData.tokens.access_token
			}
		}

		request.get(query, function(error, response, body) {
			if (!error && response.statusCode == 200) {
				resolve(body)
		  } else {
		  	reject([error, response.statusCode, body])
		  }
		})
	})
}

const frequencyToURI = (frequency) => {
	// Find the closest frequency of 
	for (const tape of tapeLibrary.tapes) {
	 	if (Math.abs(tape.frequency - frequency) < 40) {
	 		return tape.spotify_uri
	 	}
	}

}

const playSong = (frequency) => {
	// Frequency to spotify_uri
	console.log('Recieved ', frequency)
	const spotify_uri = frequencyToURI(frequency)
	if (spotify_uri) {
		// Make queries to spotify
		AppData.tokens = loadTokens()
		makeSimpleQuery('https://api.spotify.com/v1/me/player/devices')
			.then(data => {
				return JSON.parse(data).devices
			})
			.then(devices => {
				return new Promise((resolve, reject) => {
					const query = {
						url: 	'https://api.spotify.com/v1/me/player/play',
						headers: {
							'Authorization': 'Bearer ' + AppData.tokens.access_token
						},
						body: {
						  "context_uri": spotify_uri
						},
						json: true
					}

					request.put(query, function(error, response, body) {
						console.info('Sending query')
						if (!error && response.statusCode == 200 || !error && response.statusCode == 204 ) {
							console.info('Status: ', response.statusCode)
							resolve(body)
					  } else if (response.statusCode == 403){
					  	resolve(body)
					  } else {
					  	reject([error, response.statusCode, body])
					  }
					})
				})
			})
			.catch((err) => {
				err.map(message => console.error(message))
			})
	}
}

const setup = () => {
	/* Setup initial tokens */
	process.stdin.resume()
	process.stdin.setEncoding('utf8')
	console.info('Enter this into the browser and copy the code back: ')
	console.log(AppData.browserStartURL)
	process.stdin.on('data', function (text) {
		console.log('received data:', util.inspect(text))
		AppData.code = text.replace('\n', '')
		initilizeServer(AppData.code)
		setInterval(refreshToken, 3500*1000)
	})

}

const parseParams = (url) => {
	const requestKeys = {}
	try {
		let keyValues = url.split('?')[1]
		keyValues = keyValues.split('&')
		keyValues.forEach(key => {
			arr = key.split('=')
			requestKeys[arr[0]] = arr[1]
		})
		return requestKeys
	} catch(e) {
		// statements
		console
		.warn('No parameters provided');
		return 
	}
}

/*********************************************** 
					RUN SERVER & DO THINGS 
************************************************/ 

//playSong(song)
//refreshToken()
//setup()
const run = (stateKey) => http.createServer((request, response) => {
	console.info('Ready to go')
  const { headers, method, url } = request
  let body = []
  request.on('error', (err) => {
    console.error(err)
  }).on('data', (chunk) => {
    body.push(chunk)
  }).on('end', () => {
    response.on('error', (err) => {
      console.error(err)
    })

    body = Buffer.concat(body).toString()
    params = parseParams(request.url)

    response.writeHead(200, {'Content-Type': 'application/json'})

    response.end(body)
    try {
			playSong(params.frequency)
    } catch(e) {
    	console.error("Invalid request:", e);
    }
  })
}).listen(8080)


//setup()
//const stateKey = generateStateKey()
//run(stateKey)
