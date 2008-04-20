/**
 *
 * ==VimperatorPlugin==
 * @name           GViMail
 * @description    Make Gmail behave like Vim
 * @author         Mahefa Randimbisoa (DotMG) <dotmg@users.sourceforge.net>
 * @license        GPL 2.0
 * @requires       Vimperator 0.6pre, Gmail v1 or v2
 * @url            http://code.google.com/p/gvimail/
 * @version        0.1
 * ==/VimperatorPlugin==
 *
 * Mappings:
 *  zf: re-give focus to the main frame.
 *  zR: Opens all folds.
 *  zM: Closes all folds.
 */
(function(){
	// Set use_gmail_v1 to false if you don't use the older version of Gmail at all.
	// Support of the older version of Gmail is very limited.
	var use_gmail_v1 = true;
	// Set use_gmail_v2 to false if you don't use the version 2 of Gmail.
	var use_gmail_v2 = true;
	// If you have installed stylechanger.js and want to use the Vimish style, set the option below to true.
	// If you didn't yet get the gvimail.css, download it from http://code.google.com/p/gvimail/source/browse/trunk/colors/GVimail.css
	// and put it in ~/.vimperator/colors (or %HOMEPATH\vimperator\colors)
	var use_gvimail_css = true;

	// for compatibility with all versions of Vimperator >= 0.6pre,
	// we use the name viberator to indicate either Vimperator or liberator namespace.
	var viberator = (typeof liberator == 'undefined') ? vimperator : liberator;


	var GViMail = {
	modes:viberator.config.browserModes || [viberator.modes.NORMAL],
	/// get the iframe object that contains all the visible items. This should always get focus.
	getMainCanvas : function()
	{ // It is simpler to find the main canvas in Gmail v2, (id='canvas_frame')
		var canvas_frame = window.content.document.getElementById('canvas_frame');
		if (canvas_frame) return (canvas_frame);
		if (use_gmail_v1)
		{// On older versions of Gmail, The main canvas is the iframe that has the attribute left: 0pt
			return (liberator.buffer.evaluateXPath('//iframe[contains(@style, "left: 0pt")]', window.content.frames[0].document, null, true).iterateNext());
		}
		return null;
	},
	/// Execute an action by simulating a click on an image. It has 2 params: the classname (for Gmail v2)
	/// or a part of the src attribute of the img element (for Gmail v1)
	clickImage : function (classnamev2, imgsrcv1)
	{
		var elem = viberator.buffer.evaluateXPath('//*[contains(concat(" ", normalize-space(@class), " "), " '+classnamev2+' ")] | //img[contains(@src, "'+imgsrcv1+'")]', GViMail.getMainCanvas().contentDocument, null, true).iterateNext();
		// hmm, the code below generates a log: Invalid argument for followLink.
		viberator.buffer.followLink(elem, viberator.CURRENT_TAB);
	},
	/// Gives focus to the main Canvas, to make all keys working well.
	focusMainFrame:function ()
	{
		GViMail.getMainCanvas().contentWindow.focus();
	},
	/// On TabSelect (if Gmail Tab), we will give focus to the main canvas.
	isGmail:function(uri, even)
	{
		if (/^https?:\/\/mail\.google\.com\//.test(uri))
		{
			window.setTimeout(function(){GViMail.focusMainFrame();}, 100);
		}
	},
	/// when you type some key to make an action, habitually, the main canvas looses focus.
	/// we will add an EventListener on keypress to avoid this.
	preventLooseFocus:function()
	{
		if (viberator.mode == viberator.modes.NORMAL
				&& !viberator.mode.isRecording
				&& !(viberator.modes.extended & viberator.modes.MENU)
				&& !viberator.modes.passNextKey
				&& !viberator.modes.passAllKeys)
		{
			GViMail.focusMainFrame();
		}
	}
};

viberator.mappings.addUserMap(GViMail.modes, ["zM"],
	"Closes all fold",
	function () { GViMail.clickImage('Dm2exe', 'collapse_icon'); });
viberator.mappings.addUserMap(GViMail.modes, ["zR"],
	"Opens all fold",
	function () { GViMail.clickImage('kPoXId', 'expand_icon'); });
// Let's build the Gmail(v2)-custom hinttags. Follow the comments to understand.
var gmail_v2_hinttags =
	"//span[@selector]"
	// Menu Settings, Older version, Compose Mail, Inbox, Starred .. Contacts, Labels, turn on/off chat
	+ " | //span[@role='link']"
	// Refresh, Back to "label", Reply to all, Forward, Filter messages like this, ...
	// You could just use //div[@act] here, but there appears 4 unwanted hints when first-viewing a message
	+ " | //div[@act][not(ancestor::div[contains(concat(' ', normalize-space(@class), ' '), ' zWKgkf ')]) or (ancestor::div[contains(concat(' ', normalize-space(@class), ' '), ' zWKgkf ') and contains(@style, 'visibility')])]"
	// More actions, Toolbar buttons on RTE (don't use RTE, plain ascii mails are sexier)
	+ " | //*[@unselectable='on']"
	// Fold and UnFold messages in thread that has an excerpt displayed in grey
	+ " | //div[contains(concat(' ', normalize-space(@class), ' '), ' IUCKJe ')]"
	// UnFold messages in thread when no excerpt is displayed (blank line)
	//    Such <div>s have a class XoqCub, have another <div> child having the class YrHFdf, and there is no table il all their descendants
	+ " | //*[contains(concat(' ', normalize-space(@class), ' '), ' XoqCub ')]/div[@class='YrHFdf'][count(descendant-or-self::table)=0]"
	// Star on message list
	+ " | //td[@class='mka4te']/img"
	// Star on thread list (same subject)
	+ " | //td/span[starts-with(@class, 'lHQn1d')]/img"
	// Delete all spam messages now
	+ " | //*[@class='rj1J6b']"
	// Select message in the list
	+ " | //td[@class='mka4te']/ancestor::tr/td[5]"
	// Change picture [Settings] ==> next step still not working
	+ " | //div[@class='c3pyI']/span"
	// Attach a file + Add event invitation + Rich formatting|Plain text
	+ " | //*[contains(concat(' ', normalize-space(@class), ' '), ' MRoIub ')]"
	// Check spelling
	+ " | //span[@class='mrKIf']"
	// Everything that is displayed as image (+ Edit labels)
	+ " | //img[contains(@src, 'cleardot.gif')]"
	// Reply + Reply to all + Forward + show/hide details + Edit labels
	//    We will not select divs that contains any hintable elements inside
	+ " | //*[@idlink][count(descendant-or-self::span[@role='link'])=0 and count(descendant-or-self::a)=0]"
	// <label>|x
	+ " | //table[@class='Ir5Jyf']//span"
	// Settings> Accounts> make_default|edit_info|delete|View_history|Check_mail_now
	+ " | //*[contains(concat(' ', normalize-space(@class), ' '), ' GaVz0 ')]"
	// Update conversation, Ignore (when someone just posted a message on the thread you're reading & editing)
	+ " | //*[contains(concat(' ', normalize-space(@class), ' '), ' Gf76kb ')]"
	// Show|Hide quoted text
	+ " | //span[contains(concat(' ', normalize-space(@class), ' '), ' WQ9l9c ')]"
	//
	+ " | //div[contains(concat(' ', normalize-space(@class)), ' goog-menuitem')]";
// We provide limited support for Gmail(v1)
var gmail_v1_hinttags =
      "//*[contains(@class, 'lk ') or @class='msc' or @class='ll' or @class='setl' or @class='lkw' or starts-with(@class, 'sc ')] | //tr[@class='rr' or @class='ur']/td[position()=5] | //div/span[contains(@class, 'bz_rbbb')] | //span[@class='l' and contains(@id, 'sl_')]" ;
var gmail_hints = use_gmail_v1 ? gmail_v1_hinttags : "";
if (use_gmail_v2) gmail_hints = gmail_hints + (gmail_hints ? " | " : "") + gmail_v2_hinttags;
gmail_hints = gmail_hints + (gmail_hints ? " | " : "") + viberator.options['hinttags'];

// Now: override default hinttags. Override is not the true wording, I'd rather say extend.
viberator.options.add(["hinttags", "ht"],
	"XPath string of hintable elements activated by 'f' and 'F'",
	// Gmail uses span[@selector] for labels in the line Select: All, None, Read, Unread, Starred, Unstarred
	"string",
	gmail_hints);

// When navigation keys (and others) no longer work, type zf to focus to the main frame
viberator.mappings.addUserMap(GViMail.modes, ["zf"],
	"Focus main frame",
	function () { GViMail.focusMainFrame(); });
getBrowser().mTabBox.addEventListener('TabSelect', function(event){
 GViMail.isGmail(this.parentNode.currentURI.spec, event);
 }, false);
window.addEventListener('keypress', GViMail.preventLooseFocus, true);

if (use_gvimail_css && (typeof viberator.globalVariables.styles == 'undefined' || viberator.globalVariables.styles == ''))
{
	viberator.globalVariables.styles = 'style,gvimail';
}

})();
// vim:noet:
