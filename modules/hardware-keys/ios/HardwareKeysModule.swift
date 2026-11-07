import ExpoModulesCore

public class HardwareKeysModule: Module {
  public func definition() -> ModuleDefinition {
    Name("HardwareKeys")

    View(HardwareKeysView.self) {
      Events("onKey")
    }
  }
}
