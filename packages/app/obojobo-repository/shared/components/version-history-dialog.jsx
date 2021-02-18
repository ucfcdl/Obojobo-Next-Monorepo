require('./version-history-dialog.scss')
const { CSSTransition } = require('react-transition-group')
const React = require('react')
const ModuleImage = require('./module-image')
const Button = require('./button')
const Loading = require('./loading')
const { urlForEditor } = require('../repository-utils')
const ReactModal = require('react-modal')
const VersionHistoryListItem = require('./version-history-list-item')

class VersionHistoryDialog extends React.Component {
	constructor(props) {
		super(props)

		this.baseUrl = `${urlForEditor(props.editor, props.draftId)}?read_only=1`

		this.state = {
			isMenuOpen: true,
			isConfirmDialogOpen: false,
			isLockDialogOpen: false,
			isErrorDialogOpen: false,
			editorUrl: props.versionHistory.length ? this.editUrlForItem(0) : null,
			selectedIndex: 0
		}

		this.restoreModule = this.restoreModule.bind(this)
		this.setSelectedRevision = this.setSelectedRevision.bind(this)
		this.toggleMenu = this.toggleMenu.bind(this)
		this.openConfirmDialog = this.openConfirmDialog.bind(this)
		this.closeConfirmDialog = this.closeConfirmDialog.bind(this)
		this.checkModuleLock = this.checkModuleLock.bind(this)
		this.renderLockDialog = this.renderLockDialog.bind(this)
		this.closeLockDialog = this.closeLockDialog.bind(this)
		this.openErrorDialog = this.openErrorDialog.bind(this)
		this.closeErrorDialog = this.closeErrorDialog.bind(this)

		this.menuRef = React.createRef()
	}

	componentDidUpdate(prevProps) {
		// when the list goes from empty to not-empty
		// assume the list just loaded/refreshed
		// so select the first item.
		if (!prevProps.versionHistory.length && this.props.versionHistory.length) {
			this.setSelectedRevision(0)
		}
	}

	editUrlForItem(index) {
		return `${this.baseUrl}&revision_id=${this.props.versionHistory[index].id}`
	}

	setSelectedRevision(index) {
		this.setState({
			editorUrl: this.editUrlForItem(index),
			selectedIndex: index
		})
	}

	restoreModule() {
		this.closeConfirmDialog()
		this.closeLockDialog()

		if (this.state.selectedIndex === 0) {
			// Prevent restoring a module that's already
			// the latest version
			return
		}

		const selectedRevision = this.props.versionHistory[this.state.selectedIndex]
		this.props.restoreVersion(this.props.draftId, selectedRevision.id)
		this.setState({
			editorUrl: null
		})
	}

	toggleMenu() {
		this.setState({ isMenuOpen: !this.state.isMenuOpen })
	}

	openConfirmDialog() {
		this.setState({ isConfirmDialogOpen: true })
	}

	closeConfirmDialog() {
		this.setState({ isConfirmDialogOpen: false })
	}

	openLockDialog() {
		this.setState({ isLockDialogOpen: true })
	}

	closeLockDialog() {
		this.setState({ isLockDialogOpen: false })
	}

	openErrorDialog() {
		this.setState({ isErrorDialogOpen: true })
	}

	closeErrorDialog() {
		this.setState({ isErrorDialogOpen: false })
	}

	checkModuleLock() {
		this.closeConfirmDialog()

		// Check to see if anyone is editing this module before
		// we try to restore it
		this.props.checkModuleLock(this.props.draftId).then(res => {
			const { payload, error } = res

			if (error) {
				this.openErrorDialog()
				return
			}

			// payload will be undefined here if no one is
			// currently editing this module
			if (!payload) {
				this.restoreModule()
			} else {
				this.openLockDialog()
			}
		})
	}

	renderConfirmDialog() {
		if (!this.state.isConfirmDialogOpen) {
			return null
		}

		const revision = this.props.versionHistory[this.state.selectedIndex]

		return (
			<ReactModal
				isOpen={true}
				onRequestClose={this.closeConfirmDialog}
				className="repository--modal restore-confirm-dialog"
				overlayClassName="repository--modal-overlay"
			>
				<h1 className="dialog-title">Confirm Restore</h1>
				<div className="dialog-content">
					Restore version <b>{revision.versionNumber}</b> from <b>{revision.createdAtDisplay}</b>?
				</div>
				<div className="dialog-controls">
					<Button className="secondary-button" onClick={this.closeConfirmDialog}>
						Cancel
					</Button>
					<Button onClick={this.checkModuleLock}>Yes - Restore</Button>
				</div>
			</ReactModal>
		)
	}

	renderLockDialog() {
		if (!this.state.isLockDialogOpen) {
			return null
		}

		return (
			<ReactModal
				isOpen={true}
				onRequestClose={this.closeLockDialog}
				className="repository--modal restore-confirm-dialog"
				overlayClassName="repository--modal-overlay"
			>
				<h1 className="dialog-title">Warning</h1>
				<div className="dialog-content">
					This module is currently being edited by another user, are you sure you want to restore
					it?
				</div>
				<div className="dialog-controls">
					<Button className="secondary-button" onClick={this.closeLockDialog}>
						Cancel
					</Button>
					<Button onClick={this.restoreModule}>Yes - Restore</Button>
				</div>
			</ReactModal>
		)
	}

	renderErrorDialog() {
		if (!this.state.isErrorDialogOpen) {
			return
		}

		return (
			<ReactModal
				isOpen={true}
				onRequestClose={this.closeErrorDialog}
				className="repository--modal restore-confirm-dialog"
				overlayClassName="repository--modal-overlay"
			>
				<h1 className="dialog-title">Error</h1>
				<div className="dialog-content">An error occurred while restoring this version.</div>
				<div className="dialog-controls">
					<Button onClick={this.closeErrorDialog}>Close</Button>
				</div>
			</ReactModal>
		)
	}

	renderMenuToggleButton() {
		return (
			<button className="toggle-button" onClick={this.toggleMenu}>
				Toggle Navigation Menu
			</button>
		)
	}

	renderRevisionHistoryMenu() {
		return (
			<CSSTransition timeout={250} in={this.state.isMenuOpen}>
				<div className="version-history-list" ref={this.menuRef}>
					<div className="menu-expanded">
						<div className="version-history-list--title">
							<div>Version History</div>
							<div className="desc">newest first</div>
							{this.renderMenuToggleButton()}
						</div>
						{this.props.versionHistory.map((revision, index) => (
							<VersionHistoryListItem
								key={revision.id}
								isLatestVersion={index === 0}
								createdAtDisplay={revision.createdAtDisplay}
								username={revision.username}
								onClick={this.setSelectedRevision}
								isSelected={this.state.selectedIndex === index}
								index={index}
								versionNumber={revision.versionNumber}
								isRestored={revision.isRestored}
							/>
						))}
					</div>
					<div className="menu-collapsed">{this.renderMenuToggleButton()}</div>
				</div>
			</CSSTransition>
		)
	}

	render() {
		const isFirstSelected = this.state.selectedIndex === 0
		const selectedRevision = this.props.versionHistory[this.state.selectedIndex] || {}
		const currentVersionTitle = isFirstSelected
			? 'Latest Version'
			: `Version ${selectedRevision.versionNumber} from ${selectedRevision.createdAtDisplay}`

		return (
			<div className="version-history-dialog">
				{this.renderConfirmDialog()}
				{this.renderLockDialog()}
				{this.renderErrorDialog()}
				<div className="version-history-dialog--header">
					<ModuleImage id={this.props.draftId} />
					<div className="title">{this.props.title}</div>
					<Button className="close-button" onClick={this.props.onClose} ariaLabel="Close dialog">
						×
					</Button>
				</div>
				<div className="version-history-dialog--body">
					<Loading
						isLoading={this.props.isHistoryLoading}
						loadingText={'Loading version history...'}
					>
						{this.renderRevisionHistoryMenu()}
						<div className="editor-preview">
							<div className="editor-preview--header">
								<Button
									className="restore-button"
									onClick={this.openConfirmDialog}
									disabled={isFirstSelected}
								>
									Restore this version
								</Button>
								<span>Viewing: {currentVersionTitle}</span>
								<small>Note: Changes made in preview window will not be saved.</small>
							</div>
							<iframe src={this.state.editorUrl} frameBorder="0" loading="lazy" />
						</div>
					</Loading>
				</div>
			</div>
		)
	}
}

module.exports = VersionHistoryDialog
