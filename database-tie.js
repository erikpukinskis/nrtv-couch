if (typeof define !== 'function') {
  var define = require('amdefine')(
    module)}

define(["request"], function(request) {
  function DatabaseTie(name) {
    this.databaseName = name
  }
  DatabaseTie.prototype.db =
    function(verb, path) {
      var args = Array.prototype.slice.call(arguments, 2)
      var uri = "http://127.0.0.1:5984/"+path

      var callback = args.pop()
      var value = args[0]

      options = {
        uri: uri,
        method: verb,
        body: JSON.stringify(value)
      }

      function handleError(response, message) {
        if (response) {
          message = "["+response.statusCode+"] "+message
        }
        message = verb.toUpperCase()+" "+uri+" ("+JSON.stringify(value, null, 2)+") -> "+message
          
        throw new Error(message)
      }

      request(options, function(error, response, body) {
        if (error) {
          handleError(response, error.message)
        } else if (response.statusCode > "399") {
          var res = JSON.parse(response.body)
          handleError(response, res.error+": "+res.reason)
        }
        callback(JSON.parse(body))
      })
    }

  DatabaseTie.prototype.createDatabase = 
    function(callback) {
      this.db(
        'put',
        this.databaseName,
        function() {
          callback()
        }
      )
    }

  DatabaseTie.prototype.start =
    function(callback) {
      var _this = this

      this.createDatabase(function() {
        clearTimeout(timeout)
        callback()
      })

      var timeout = setTimeout(
        function() {
          throw new Error("the couch is ignoring us!")
        }
      , 100)
    }

  DatabaseTie.prototype.path =
    function(key) {
      return this.databaseName+'/'+key 
    }
  DatabaseTie.prototype.set =
    function(key, value, callback) {
      this.db(
        'put',
        this.path(key),
        value,
        callback
      )
    }

  DatabaseTie.prototype.get =
    function(key, callback) {
      this.db(
        "get",
        this.path(key),
        callback
      )
    }

  return function(component) {
    component.addTypeOfTie(
      "database", DatabaseTie, ["start"]
    )
  }
})