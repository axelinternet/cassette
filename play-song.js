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
		- Spela upp en låt från tapeLibrary
		- Fyll tapeLibrary med lite Sample Data
		- flytta keys till secrets fil
	Bygger hela det här som en enkel node app bara. Skickar enkla get mellan delarna så kan man dra 
	isär modulerna sen om det visar sig vara enklare. Den här appen skulle ju kunna ligga på en server då? Då löser man inloggningen osv enkelt också. Vart kan man hosta node? Zeit now
*/

/*  
		Sample of how to build up tapeLibrary. This object is what will be used to keep the 
		connection between my service and spotify. Building some sort of funky interface for this
		would be cool. Buiild this as a rest microservice and just build a super simple NUXT or next.js
		site? 
*/ 

const generateStateKey = (keyLength = 8) => {
	const allowed = 'abcdefghijklmnopqrstuvxyzABCDEFGHIJKLMNOPQRSTUVXYZ0123456789'
	let key = ''
	for (let i = 0; i < keyLength; i++) {
		key = key + allowed[Math.round(Math.random() * allowed.length)]
	}
	return key
}

const tapeLibrary = {
	tapes: [
		{
			mer_data: 'get this from API later',
			spotify_uri: 'spotify:album:3AZThW5w8QRSZ0SRhiHARd'
		}
	]
}

const loadKeys = () => {
	const tokens = JSON.parse(fs.readFileSync('keys.secret').toString())
	// TODO: Something to check if token has expired
	return tokens
}

const getAccessToken = (code) => {
	// Run this first with code to get inital accesstoken. 
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

playSong = (spotify_uri) => {
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

const setup = () => {
	/* Setup initial tokens */
	process.stdin.resume()
	process.stdin.setEncoding('utf8')
	console.info('Enter this into the browser and copy the code back: ')
	console.log(AppData.browserStartURL)
	process.stdin.on('data', function (text) {
	console.log('received data:', util.inspect(text))
		AppData.code = text.replace('\n', '')
		getAccessToken(AppData.code)
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

//setup()
//playSong(song)
//refreshToken()
//setup()
const run = () => http.createServer((request, response) => {
	const stateKey = generateStateKey()
	console.info('StateKey', stateKey)
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
    try {
			playSong(params.spotify_uri)
    } catch(e) {
    	console.error("Invalid request, no spotify_uri provided");
    }
    response.writeHead(200, {'Content-Type': 'application/json'})

    response.end(body)
  })
}).listen(8080)

run()
