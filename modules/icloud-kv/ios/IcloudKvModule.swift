import ExpoModulesCore
import Foundation

/// iCloud key-value store (1 MB). Strings only; the JS side owns the format and merge rules.
public class IcloudKvModule: Module {
  private var observer: NSObjectProtocol?

  public func definition() -> ModuleDefinition {
    Name("IcloudKv")

    Events("onChange")

    OnStartObserving {
      let store = NSUbiquitousKeyValueStore.default
      self.observer = NotificationCenter.default.addObserver(
        forName: NSUbiquitousKeyValueStore.didChangeExternallyNotification,
        object: store,
        queue: .main
      ) { [weak self] _ in
        self?.sendEvent("onChange", [:])
      }
      store.synchronize()
    }

    OnStopObserving {
      if let observer = self.observer {
        NotificationCenter.default.removeObserver(observer)
        self.observer = nil
      }
    }

    Function("getString") { (key: String) -> String? in
      return NSUbiquitousKeyValueStore.default.string(forKey: key)
    }

    Function("setString") { (key: String, value: String) in
      let store = NSUbiquitousKeyValueStore.default
      store.set(value, forKey: key)
      store.synchronize()
    }

    Function("synchronize") { () -> Bool in
      return NSUbiquitousKeyValueStore.default.synchronize()
    }
  }
}
