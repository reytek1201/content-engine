import AuthenticationServices
import Capacitor

@objc(NativeAppleSignInPlugin)
public class NativeAppleSignInPlugin: CAPPlugin, CAPBridgedPlugin, ASAuthorizationControllerDelegate,
    ASAuthorizationControllerPresentationContextProviding
{
    public let identifier = "NativeAppleSignInPlugin"
    public let jsName = "SignInWithApple"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "authorize", returnType: CAPPluginReturnPromise),
    ]

    private var pendingCall: CAPPluginCall?
    private var authorizationController: ASAuthorizationController?

    @objc func authorize(_ call: CAPPluginCall) {
        // Reject any in-flight call before starting a new one so its JS
        // promise doesn't hang indefinitely.
        if let existing = pendingCall {
            existing.reject("Superseded by a new authorize call.")
            pendingCall = nil
        }
        authorizationController = nil

        pendingCall = call

        let provider = ASAuthorizationAppleIDProvider()
        let request = provider.createRequest()
        request.requestedScopes = requestedScopes(from: call)
        request.state = call.getString("state")
        request.nonce = call.getString("nonce")

        // Keep a strong reference until the delegate callback fires.
        // Without this the controller can be deallocated before it calls back.
        let controller = ASAuthorizationController(authorizationRequests: [request])
        controller.delegate = self
        controller.presentationContextProvider = self
        authorizationController = controller
        controller.performRequests()
    }

    private func requestedScopes(from call: CAPPluginCall) -> [ASAuthorization.Scope] {
        guard let scopes = call.getString("scopes") else {
            return [.email, .fullName]
        }

        var requested: [ASAuthorization.Scope] = []
        if scopes.contains("name") {
            requested.append(.fullName)
        }
        if scopes.contains("email") {
            requested.append(.email)
        }

        return requested.isEmpty ? [.email, .fullName] : requested
    }

    public func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
        bridge?.viewController?.view.window ?? ASPresentationAnchor()
    }

    public func authorizationController(
        controller: ASAuthorizationController,
        didCompleteWithAuthorization authorization: ASAuthorization
    ) {
        guard let call = pendingCall else { return }
        pendingCall = nil
        authorizationController = nil

        guard let credential = authorization.credential as? ASAuthorizationAppleIDCredential else {
            call.reject("Unexpected Apple credential type.")
            return
        }

        guard
            let identityTokenData = credential.identityToken,
            let identityToken = String(data: identityTokenData, encoding: .utf8),
            let authorizationCodeData = credential.authorizationCode,
            let authorizationCode = String(data: authorizationCodeData, encoding: .utf8)
        else {
            call.reject("Apple did not return sign-in tokens.")
            return
        }

        call.resolve([
            "response": [
                "user": credential.user,
                "email": credential.email as Any,
                "givenName": credential.fullName?.givenName as Any,
                "familyName": credential.fullName?.familyName as Any,
                "identityToken": identityToken,
                "authorizationCode": authorizationCode,
            ],
        ])
    }

    public func authorizationController(
        controller: ASAuthorizationController,
        didCompleteWithError error: Error
    ) {
        guard let call = pendingCall else { return }
        pendingCall = nil
        authorizationController = nil
        call.reject(error.localizedDescription)
    }
}
