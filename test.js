var test = require("nrtv-test")(require)

test.using(
  "can get back an object we set",

  ["./", "nano"],
  function(expect, done, couch, nano) {

    var db

    var nano = nano("http://localhost:5984")

    nano.db.destroy("floober",
      function(err, body) {
        db = couch.create("floober")
        db.set(
          "foo",
          {bar: "baz"},
          checkThatItsThere
        )
      }
    )

    function checkThatItsThere() {
      db.get("foo",
        function(value) {
          expect(value.bar).to.equal("baz")
          done()
        }
      )
    }

  }
)