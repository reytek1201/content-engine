import UIKit
import Capacitor

class ViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(NativeAppleSignInPlugin())
        bridge?.registerPluginInstance(NativeWidgetPlugin())
    }
}
