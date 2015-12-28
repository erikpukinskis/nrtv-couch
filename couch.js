var library = require("nrtv-library")(require)

module.exports = library.export(
  "nrtv-couch",
  ["request"],
  function(request) {
    function Connection(name) {
      this.databaseName = name
    }

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
            handleError(response, response.body)
          } else if (response.statusCode > 399) {
            var res = JSON.parse(response.body)
            handleError(response, res.error+": "+res.reason)
          } else {
            callback(JSON.parse(body))
          }
        })
      }

    Connection.prototype.uri =
      function(key) {
        return uri(this.databaseName+'/'+key)
      }

    function handleError(response, message) {
      if (message == "not_found: no_db_file") {
        throw new Error("There doesn't seem to be any database called \""+this.databaseName+"\". If it hasn't been created yet, do couch.create(\""+this.databaseName+"\")")
      } else {
        throw new Error(message)
      }
    }

    Connection.prototype.set =
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

    Connection.prototype.get =
      function(key, callback) {
        command(
          "get",
          this.uri(key),
          null,
          callback,
          handleError.bind(this)
        )
      }

    function create(name, callback) {
      var db = new Connection(name)

      command(
        'put',
        uri(name),
        null,
        function() {
          callback && callback(db)
        },
        handleError.bind(db)
      )

      return db
    }

    function connect(name) {
      return new Connection(name)
    }

    return {
      create: create,
      connect: connect
    }

  }
)