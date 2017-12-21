const fetch = require('node-fetch')
const request = require('request')
const fs = require('fs')
// Colorize errors, warn, info
require('console-warn');
require('console-error');
require('console-info');

/*
 Fixat så att det går att köra en query iaf. För att starta behöver man klippa in i en ruta. Det är väl OK nu men:

 	X Det behövs ett flöde för att ta han dom den strängen. Gör en funktion som tar den parametern man får tillbaka och sen fixar resten. Det är kanske egentligen bara att sno deras login flöde från appen och sluta krånga till det. Bara så appen kan bli authad i första steget.

	- flytta keys till secrets fil

 	X Lägg till korrekta scopes för spotify connect

 	- Lägg still scope variabeln. 

 	- Hämta ut enheter via connect

 	- Bygg en mer dynamisk query funktion

 	- bygg refresh token funktion

Behöver också klura ut hur man ska ta imot signalen från kasetten. Det kanske bara är lättare att flytta över hela den här skiten till python? Eller eventuellt bara ta deras exempel och ha som login. Blanding av post och gets i alla fall. Ganska många olika. Annars så kan man ju bara ha ett script här eller i package.json som startar python applikationen, den kan ju skicka hit bara med en ton. Flexibelt?
https://axelinternet.github.io/?code=
/*/

const AppData = {
	redirect_uri: 'https://axelinternet.github.io/',
	browserStartURL: 'https://accounts.spotify.com/authorize?client_id=8ea462bac3fa40fa9d9d5679e2b6f93d&response_type=code&redirect_uri=https://axelinternet.github.io/&scope=user-read-currently-playing%20user-modify-playback-state%20user-read-playback-state%20streaming',
	client_id: '8ea462bac3fa40fa9d9d5679e2b6f93d',
	client_secret: '08bbb45c21f14b73acd6b36937959ffa',
	scope: 'user-read-currently-playing%20user-modify-playback-state%20user-read-playback-state%20streaming',
	tokens: {}
}

// Assign manually
const code = 'AQBnfXnau3GTptV-sxRMUZBfNqUUU52rsTdIVMuh3fJGErR3yVILTiKUxj7pePS7wK6nS_Xqp42YKyZaJlBXOIRk0y4BuUmrT3WlDc6rmILthZ2HX5sv3jaiUtH721dBip4f7jJqj29pZ5Sv-1CtvvKttIEq5sYCMXRTdJmsJyUYXQLrvFYobE_CpdPrIJqdpdnUJw1yDHxC3axGqFwZCCLtYDit0IK7G0WhOqXPhAliP91Po4cT7zgO69ETrNe42j7YA6v7qkdC5Sdm40MUrp_ub0nVmt_4PZFNGswOrc-Gd17RnLPHIVUtz-r1uT4A9rF2'

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
	  	console.error(error, body, "\n", response)
	  } 
	})
	

}

const loadTokens = () => JSON.parse(fs.readFileSync('tokens.json').toString())


const makeQuery = (url) =>  {
	return new Promise((resolve, reject) => {
		const query = {
			url: url,
			headers: {
				'Authorization': 'Bearer ' + AppData.tokens.access_token
			}
		}

		request.get(query, function(error, response, body) {
			console.info('Sending query')
			if (!error && response.statusCode == 200) {
				resolve(body)
		  } else {
		  	reject(error)
		  }
		})
	})
}




// Get initial token
//getAccessToken(code)
// Load saved tokens from file and send test request
//loadTokens()


AppData.tokens = loadTokens()
makeQuery('https://api.spotify.com/v1/me/player/devices')
	.then(data => {
			console.log(data)
		})
		.catch(err => {console.error('ERROR', err)})
