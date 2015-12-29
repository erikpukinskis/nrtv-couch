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

        console.log(
          "couch ∈∋",
          verb.toUpperCase(),
          uri,
          value ? JSON.stringify(value, null, 2) : "[empty]"
        )

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
            var body = JSON.parse(response.body)
            handleError(response, body)
          } else {
            callback && callback(JSON.parse(body))
          }
        })
      }

    function handleError(response, message) {

      if (message.error == "not_found" && message.reason == "no_db_file") {
        throw new Error("There doesn't seem to be any database called \""+this.databaseName+"\". If it hasn't been created yet, do couch.create(\""+this.databaseName+"\")")
      } else {
        throw new Error(message.error+": "+message.reason)
      }
    }

    function getUuid(callback) {
      command(
        "get",
        uri("_uuids"),
        null,
        function(response) {
          var ids = response.uuids
          callback(ids[0])
        },
        handleError
      )
    }

    function KeyStore(options, callback) {
      this.databaseName = options.database
      this.keyField = options.key

      var path = "_design/keystores"

      var designDocumentUri = this.uri(path)

      create(options.database, getDesignDoc)

      function getDesignDoc() {
        command(
          "get",
          designDocumentUri,
          null,
          function(doc) {
            if (doc.views.color) {
              callback(false)
            } else {
              throw new Error("nrtv-couch doesn't know how to update design docs yet")
            }

          },
          function(response, error) {
            if (error.error == "not_found") {
              updateDoc({
                _id: path,
                views: {}
              })
            } else {
              handleError(response, error)
            }
          }
        )
      }

      function updateDoc(doc) {
        var map = function(doc) {
          if(doc.value) {
            emit(doc.value, doc)
          }
        }

        doc.views[options.key] = {
          map: map.toString().replace(/value/g, options.key)
        }

        command(
          "put",
          designDocumentUri,
          doc,
          function() {
            callback(true)
          },
          handleError
        )
      }
    }

    KeyStore.prototype.set =
      function(key, object, callback) {

        if (!object[this.keyField]) {
          object[this.keyField] = key
        }

        var store = this

        if (!object._id) {
          getUuid(function(id) {
            object._id = id
            store.set(key, object, callback)
          })
          return
        }

        command(
          'put',
          this.uri(object._id),
          object,
          function() {
            callback()
          },
          handleError.bind(this)
        )
      }

    KeyStore.prototype.get =
      function(key, callback) {
        var store = this
        var path = "_design/keystores/_view/"+this.keyField+"?key=\""+key+"\"&limit=1"

        command(
          "get",
          this.uri(path),
          null,
          function(result) {
            var doc = result.rows[0].value
            callback(doc)
          },
          function(response, error) {
            if (error.error == "not_found") {
              throw new Error("There doesn't seem to be anything at \""+key+"\" in database "+store.databaseName+": "+error.reason)
            } else {
              handleError(response, error)
            }
          }
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