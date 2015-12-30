var library = require("nrtv-library")(require)

module.exports = library.export(
  "nrtv-couch",
  ["request", "./one-time-lock"],
  function(request, OneTimeLock) {

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

    var setupLocks = {}

    function KeyStore(database, key, callback) {

      this.databaseName = database
      this.keyField = key
      var identifier = database+"/"+key
      var store = this
      var lock = setupLocks[identifier]

      if (!lock) {
        lock =
        setupLocks[identifier] =
          new OneTimeLock(
            function(unlock) {
              store._updateDoc(unlock)
            }
          )
      }

      lock.whenOpen(callback)

      this.setupLock = lock
    }

    KeyStore.prototype._updateDoc =
      function(callback) {
        var path = "_design/keystores"
        var designDocumentUri = this.uri(path)
        var store = this

        create(this.databaseName,
          getDoc)

        function getDoc() {
          command(
            "get",
            designDocumentUri,
            null,
            makeSureItsGood,
            createNewDocOrErrorOut
          )
        }

        function makeSureItsGood(doc) {
          if (doc.views.color) {
            callback(false)
          } else {
            throw new Error("nrtv-couch doesn't know how to update design docs yet")
          }
        }

        function createNewDocOrErrorOut(response, details) {
          if (details.error == "not_found") {
            updateDoc({
              _id: path,
              views: {}
            })
          } else {
            handleError(response, error)
          }
        }

        var key = this.keyField

        function updateDoc(doc) {
          var map = function(doc) {
            if(doc.PLACEHOLDER) {
              emit(doc.PLACEHOLDER, doc)
            }
          }

          doc.views[key] = {
            map: map.toString().replace(/PLACEHOLDER/g, key)
          }

          command(
            "put",
            designDocumentUri,
            doc,
            callback,
            handleError
          )
        }
      }

    KeyStore.prototype.set =
      function(value, object, callback) {

        if (!object[this.keyField]) {
          object[this.keyField] = value
        }

        var store = this

        if (!object._id) {
          getUuid(function(id) {
            object._id = id
            store.set(value, object, callback)
          })
          return
        }

        this.setupLock.whenOpen(
          command.bind(null,
            'put',
            this.uri(object._id),
            object,
            callback,
            handleError.bind(this)
          )
        )
      }

    KeyStore.prototype.get =
      function(key, callback) {

        var path = "_design/keystores/_view/"+this.keyField+"?key=\""+key+"\"&limit=1"

        this.setupLock.whenOpen(
          command.bind(null,
            "get",
            this.uri(path),
            null,
            getFirstRow,
            tryToHelp
          )
        )

        function getFirstRow(result) {
          var entry = result.rows[0]

          callback(entry && entry.value)
        }

        var store = this

        function tryToHelp(response, error) {
          var pattern = {}
          pattern[store.keyField] = key
          if (error.error == "not_found") {
            throw new Error("There don't seem to be any documents with "+JSON.stringify(pattern)+" in the couch database "+store.databaseName+". ("+error.error+", "+error.reason+")")
          } else {
            handleError(response, error)
          }
        }
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
        callback || noop,
        itsOkIfItExists
      )

      function itsOkIfItExists(error, message) {
        if (message.error == "file_exists") {
          callback && callback(false)
        } else {
          throw new Error(message.reason)
        }
      }
    }

    function noop() {}

    return {
      KeyStore: KeyStore
    }

  }
)