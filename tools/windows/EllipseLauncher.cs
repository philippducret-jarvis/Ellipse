using System;
using System.ComponentModel;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Reflection;
using System.Windows.Forms;
using Microsoft.Win32;

[assembly: AssemblyTitle("Ellipse Studio")]
[assembly: AssemblyDescription("Lanceur de la plateforme de création de jeux Ellipse")]
[assembly: AssemblyProduct("Ellipse Studio")]
[assembly: AssemblyVersion("1.1.0.0")]
[assembly: AssemblyFileVersion("1.1.0.0")]

internal static class EllipseLauncher
{
    private static readonly string Root = AppDomain.CurrentDomain.BaseDirectory;
    private static readonly string LogPath = Path.Combine(Root, "generated", "logs", "launcher.log");
    private const string StudioUrl = "http://localhost:4273/";

    [STAThread]
    private static int Main(string[] args)
    {
        bool noBrowser = Array.IndexOf(args, "--no-browser") >= 0;
        bool stop = Array.IndexOf(args, "--stop") >= 0;
        if (noBrowser || stop)
        {
            try { return StartServices(stop); }
            catch (Exception error) { SaveError(error); return 1; }
        }
        Application.EnableVisualStyles();
        Application.SetCompatibleTextRenderingDefault(false);
        int result = 1;
        using (Form window = new Form())
        {
            window.Text = "Ellipse Studio";
            window.ClientSize = new Size(440, 170);
            window.FormBorderStyle = FormBorderStyle.FixedDialog;
            window.MaximizeBox = false;
            window.StartPosition = FormStartPosition.CenterScreen;
            window.BackColor = Color.FromArgb(18, 16, 27);
            window.ForeColor = Color.FromArgb(239, 225, 202);
            window.Icon = Icon.ExtractAssociatedIcon(Assembly.GetExecutingAssembly().Location);
            var title = new Label { Text = "ELLIPSE", Font = new Font("Segoe UI", 21, FontStyle.Bold), AutoSize = true, Location = new Point(26, 22) };
            var subtitle = new Label { Text = "Démarrage du Studio et de ses services…", AutoSize = true, Location = new Point(29, 76), Font = new Font("Segoe UI", 10) };
            var progress = new ProgressBar { Style = ProgressBarStyle.Marquee, MarqueeAnimationSpeed = 28, Location = new Point(30, 116), Size = new Size(380, 5) };
            window.Controls.AddRange(new Control[] { title, subtitle, progress });
            var worker = new BackgroundWorker();
            worker.DoWork += delegate(object sender, DoWorkEventArgs e) { e.Result = StartServices(false); };
            worker.RunWorkerCompleted += delegate(object sender, RunWorkerCompletedEventArgs e)
            {
                try
                {
                    if (e.Error != null) throw e.Error;
                    result = (int)e.Result;
                    if (result != 0) throw new Exception("Un service n’a pas démarré correctement.");
                    Process.Start(new ProcessStartInfo(StudioUrl) { UseShellExecute = true });
                }
                catch (Exception error)
                {
                    result = 1;
                    SaveError(error);
                    MessageBox.Show("Ellipse n’a pas pu s’ouvrir.\n\n" + error.Message + "\n\nDétails :\n" + LogPath, "Ellipse — démarrage", MessageBoxButtons.OK, MessageBoxIcon.Error);
                }
                window.Close();
            };
            window.Shown += delegate { worker.RunWorkerAsync(); };
            // Éviter de laisser le démarrage sans retour en fermant la fenêtre d’attente.
            window.FormClosing += delegate(object sender, FormClosingEventArgs e) { if (worker.IsBusy) e.Cancel = true; };
            Application.Run(window);
        }
        return result;
    }

    private static int StartServices(bool stop)
    {
        string script = Path.Combine(Root, "tools", "launch-ellipse.mjs");
        if (!File.Exists(script)) throw new FileNotFoundException("Conservez Ellipse.exe dans le dossier Projet Ellipse, avec son dossier tools.", script);
        string node = FindNode();
        Directory.CreateDirectory(Path.GetDirectoryName(LogPath));
        using (var log = new StreamWriter(LogPath, false, System.Text.Encoding.UTF8))
        using (var process = new Process())
        {
            object gate = new object();
            log.AutoFlush = true;
            log.WriteLine("Ellipse Studio — " + DateTime.Now.ToString("s"));
            process.StartInfo = new ProcessStartInfo(node, "\"" + script + "\" " + (stop ? "--stop" : "--no-browser"))
            {
                WorkingDirectory = Root, UseShellExecute = false, CreateNoWindow = true,
                RedirectStandardOutput = true, RedirectStandardError = true,
                StandardOutputEncoding = System.Text.Encoding.UTF8,
                StandardErrorEncoding = System.Text.Encoding.UTF8
            };
            process.OutputDataReceived += delegate(object sender, DataReceivedEventArgs e) { if (e.Data != null) lock (gate) log.WriteLine(e.Data); };
            process.ErrorDataReceived += delegate(object sender, DataReceivedEventArgs e) { if (e.Data != null) lock (gate) log.WriteLine(e.Data); };
            process.Start(); process.BeginOutputReadLine(); process.BeginErrorReadLine(); process.WaitForExit();
            return process.ExitCode;
        }
    }

    private static string FindNode()
    {
        string[] common = {
            Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), "nodejs", "node.exe"),
            Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Programs", "nodejs", "node.exe")
        };
        foreach (string path in common) if (File.Exists(path)) return path;
        foreach (string dir in (Environment.GetEnvironmentVariable("PATH") ?? "").Split(Path.PathSeparator))
        {
            if (String.IsNullOrWhiteSpace(dir)) continue;
            try { string path = Path.Combine(dir.Trim().Trim('"'), "node.exe"); if (File.Exists(path)) return path; } catch { }
        }
        throw new FileNotFoundException("Node.js est introuvable. Réinstallez Node.js pour lancer Ellipse.");
    }

    private static void SaveError(Exception error)
    {
        try { Directory.CreateDirectory(Path.GetDirectoryName(LogPath)); File.AppendAllText(LogPath, "\n" + error + "\n"); } catch { }
    }
}
