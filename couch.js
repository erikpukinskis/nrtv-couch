var library = require("nrtv-library")(require)

module.exports = library.export(
  "nrtv-couch",
  ["request"],
  function(request) {

    function uri(path) {
      var host = "http://127.0.0.1:5984/"
      return host+path
    }

    function command(verb, uri, value, callback, handleError) {

        options = {
          uri: uri,
          method: verb,
          body: value ? JSON.stringify(value) : null
        }

        request(options, function(error, response, body) {
          if (error && error.code == 'ECONNREFUSED') {
            throw new Error("You need to start couchdb. We expected it to be at "+host)
          } else if (error) {
            handleError(response, error.message)
          } else if (response.statusCode == 412) {
            handleError(response, JSON.parse(response.body))
          } else if (response.statusCode > 399) {
            var res = JSON.parse(response.body)
            handleError(response, res.error+": "+res.reason)
          } else {
            callback && callback(JSON.parse(body))
          }
        })
      }

    function handleError(response, message) {
      if (message == "not_found: no_db_file") {
        throw new Error("There doesn't seem to be any database called \""+this.databaseName+"\". If it hasn't been created yet, do couch.create(\""+this.databaseName+"\")")
      } else {
        throw new Error(message)
      }
    }

    function KeyStore(options, callback) {
      this.databaseName = options.database

      create(options.database, callback)
    }

    KeyStore.prototype.set =
      function(key, value, callback) {
        command(
          'put',
          this.uri(key),
          value,
          function() {
            callback()
          },
          handleError.bind(this)
        )
      }

    KeyStore.prototype.get =
      function(key, callback) {
        command(
          "get",
          this.uri(key),
          null,
          callback,
          handleError.bind(this)
        )
      }

    KeyStore.prototype.uri =
      function(key) {
        return uri(this.databaseName+'/'+key)
      }

    function create(name, callback) {

      command(
        'put',
        uri(name),
        null,
        function() {
          callback && callback(true)
        },
        function(error, message) {
          if (message.error == "file_exists") {
            callback && callback(false)
          } else {
            console.log("RZN", typeof message)
            throw new Error(message.reason)
          }
        }
      )
    }

    return {
      KeyStore: KeyStore
    }

  }
)