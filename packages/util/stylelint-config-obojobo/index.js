module.exports = {
	"extends": "stylelint-config-standard",
	"plugins": ["stylelint-declaration-use-variable"],
	"rules": {
		"indentation": "tab",
		"at-rule-no-unknown": [
			true,
			{
				"ignoreAtRules": ["include", "mixin"]
			}
		],
		"unit-disallowed-list": [
			"px",
			{
				"ignoreProperties": {
					"px": ["/^border/", "/^transform/", "/box-shadow/", "perspective", "text-indent"]
				}
			}
		],
		"color-hex-length": "long",
		"sh-waqar/declaration-use-variable": [["/color/", "font-family"]]
	}
}
