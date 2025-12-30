mod api;
mod services;
mod analysis;

use api::{
  editor_cmds,
  shell_cmds,
  ai_cmds,
  git_cmds,
  lsp_cmds,
  code_runner,
  interactive_runner,
  security_cmds,
  exploit_cmds,
  extension_cmds,
  search_cmds,
  prover_cmds,
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_shell::init())
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
      // Editor commands
      editor_cmds::read_file,
      editor_cmds::write_file,
      editor_cmds::create_file,
      editor_cmds::delete_file,
      editor_cmds::create_directory,
      editor_cmds::list_directory,
      editor_cmds::get_home_directory,
      editor_cmds::rename_file,
      // Shell commands - PTY based
      shell_cmds::create_terminal_session,
      shell_cmds::write_to_terminal,
      shell_cmds::read_from_terminal,
      shell_cmds::close_terminal_session,
      shell_cmds::resize_terminal,
      shell_cmds::list_terminal_sessions,
      // Shell commands - Legacy
      shell_cmds::execute_command,
      shell_cmds::get_shell_info,
      shell_cmds::get_current_directory,
      shell_cmds::change_directory,
      // Code runner commands
      code_runner::run_code_file,
      code_runner::run_code_snippet,
      code_runner::get_supported_languages,
      code_runner::check_language_available,
      // Interactive runner commands
      interactive_runner::start_interactive_process,
      interactive_runner::send_process_input,
      interactive_runner::stop_interactive_process,
      interactive_runner::list_interactive_processes,
      // AI commands
      ai_cmds::ai_chat,      ai_cmds::ai_code_completion,
      ai_cmds::ai_code_explain,
      // Git commands
      git_cmds::git_status,
      git_cmds::git_commit,
      git_cmds::git_add,
      git_cmds::git_push,
      git_cmds::git_pull,
      git_cmds::git_list_branches,
      git_cmds::git_create_branch,
      git_cmds::git_checkout_branch,
      git_cmds::git_log,
      git_cmds::git_init,
      git_cmds::git_clone,
      // LSP commands
      lsp_cmds::lsp_initialize,
      lsp_cmds::lsp_completion,
      lsp_cmds::lsp_hover,
      // Security commands
      security_cmds::scan_file_for_issues,
      security_cmds::run_security_scan,
      security_cmds::fetch_juice_shop_challenges,
      // Exploit commands
      exploit_cmds::get_exploit_payloads,
      exploit_cmds::run_exploit_simulation,
      exploit_cmds::run_exploit_with_custom_payload,
      // Extension commands
      extension_cmds::fetch_marketplace,
      extension_cmds::search_marketplace,
      extension_cmds::get_extension_details,
      extension_cmds::install_from_marketplace,
      extension_cmds::list_installed_extensions,
      extension_cmds::enable_extension,
      extension_cmds::disable_extension,
      extension_cmds::uninstall_extension,
      // Search commands
      search_cmds::search_in_files,
      search_cmds::replace_in_files,
      // Exploit Prover commands
      prover_cmds::prove_exploitability,
      prover_cmds::quick_scan_sinks,
      prover_cmds::index_workspace,
      prover_cmds::analyze_cross_file,
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
