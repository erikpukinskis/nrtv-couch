var test = require("nrtv-test")(require)

test.using(
  "can get back an object we set",

  ["./", "nano"],
  function(expect, done, couch, nano) {

    var nano = nano("http://localhost:5984")

    nano.db.destroy(
      "power-rangers__test",
      function(err, body) {

        var rangers = 
          new couch.KeyStore(
            "power-rangers__test",
            "color"
          )

        rangers.set(
          "yellow",
          {powerCoin: "Saber-Toothed Tiger"}
        )

        rangers.get(
          "yellow",
          runChecks
        )
      }
    )

    function runChecks(ranger) {
      expect(ranger).to.have.property("powerCoin", "Saber-Toothed Tiger")
      expect(ranger).to.have.property("color", "yellow")
      expect(ranger._id).to.match(/[a-z0-9]{32}/)
      done.ish("got value back")

      testReCreating()
    }

    function testReCreating() {
      new couch.KeyStore(
        "power-rangers__test",
        "color",
        done
      )
    }
  }
)