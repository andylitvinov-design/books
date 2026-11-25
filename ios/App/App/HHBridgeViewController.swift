import Capacitor

class HHBridgeViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(HHCourseActivityPlugin())
    }
}
